#!/usr/bin/env node
'use strict';

/**
 * Seed the Open Source Examples hub discussion on GitHub.
 *
 * GitHub does not expose an API to create discussion categories — add
 * "Open Source Examples" once in Settings → Discussions if you want a
 * dedicated category (slug: open-source-examples). Until then, the hub
 * is created under Show and tell.
 *
 * Usage: npm run discussions:sync
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OWNER = 'aadorian';
const REPO = 'opencodeCLI';
const PREFERRED_CATEGORY = 'Open Source Examples';
const FALLBACK_CATEGORY = 'Show and tell';
const HUB_TITLE = 'Open Source Examples — share your workflows';
const HUB_BODY_PATH = path.join(__dirname, '..', 'docs/discussions/open-source-examples.md');

function ghGraphql(query, variables = {}) {
  const payload = JSON.stringify({ query, variables });
  const out = execSync('gh api graphql --input -', {
    input: payload,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(out);
  if (parsed.errors?.length) {
    throw new Error(parsed.errors.map(e => e.message).join('; '));
  }
  return parsed.data;
}

function repoMeta() {
  return ghGraphql(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { id }
    }`,
    { owner: OWNER, name: REPO }
  ).repository;
}

function listCategories(repositoryId) {
  return ghGraphql(
    `query($id: ID!) {
      node(id: $id) {
        ... on Repository {
          discussionCategories(first: 25) {
            nodes { id name slug }
          }
        }
      }
    }`,
    { id: repositoryId }
  ).node.discussionCategories.nodes;
}

function pickCategory(categories) {
  return (
    categories.find(c => c.name === PREFERRED_CATEGORY) ||
    categories.find(c => c.name === FALLBACK_CATEGORY) ||
    null
  );
}

function findHubDiscussion(repositoryId, categoryId) {
  const data = ghGraphql(
    `query($id: ID!, $categoryId: ID!) {
      node(id: $id) {
        ... on Repository {
          discussions(first: 50, categoryId: $categoryId, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { id number title url }
          }
        }
      }
    }`,
    { id: repositoryId, categoryId }
  );
  return data.node.discussions.nodes.find(d => d.title === HUB_TITLE) || null;
}

function createHubDiscussion(repositoryId, categoryId, body) {
  const discussion = ghGraphql(
    `mutation($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion { id number title url }
      }
    }`,
    {
      input: {
        repositoryId,
        categoryId,
        title: HUB_TITLE,
        body,
      },
    }
  ).createDiscussion.discussion;

  console.log(`Created hub discussion: ${discussion.url}`);
  return discussion;
}

function main() {
  if (!fs.existsSync(HUB_BODY_PATH)) {
    throw new Error(`Missing hub body: ${HUB_BODY_PATH}`);
  }
  const body = fs.readFileSync(HUB_BODY_PATH, 'utf8');

  const { id: repositoryId } = repoMeta();
  const categories = listCategories(repositoryId);
  const category = pickCategory(categories);

  if (!category) {
    throw new Error(`No suitable discussion category found in ${OWNER}/${REPO}`);
  }

  console.log(`Using category: ${category.name} (${category.slug})`);
  if (category.name !== PREFERRED_CATEGORY) {
    console.log(
      `\nTip: add a "${PREFERRED_CATEGORY}" category in repo Settings → Discussions,` +
        ' then re-run to move future posts there. Templates: .github/DISCUSSION_TEMPLATE/show-and-tell.yml (active), open-source-examples.yml (after category is added)'
    );
  }

  let hub = findHubDiscussion(repositoryId, category.id);
  if (!hub) {
    hub = createHubDiscussion(repositoryId, category.id, body);
  } else {
    console.log(`Hub discussion exists: ${hub.url}`);
  }

  const categoryUrl =
    category.name === PREFERRED_CATEGORY
      ? `https://github.com/${OWNER}/${REPO}/discussions/categories/${category.slug}`
      : `https://github.com/${OWNER}/${REPO}/discussions?discussions_q=${encodeURIComponent(HUB_TITLE)}`;

  console.log(`\nOpen Source Examples hub: ${hub.url}`);
  console.log(`Category: ${categoryUrl}`);
  console.log('Pin the hub in the Discussions UI if you want it featured alongside Welcome.');
}

main();
