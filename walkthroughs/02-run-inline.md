![Inline prompt example](../media/walkthrough/inline.svg)

Pass a prompt directly to OpenCode without entering interactive mode:

```bash
opencode run "write a function to reverse a string in Python"
```

For more complex tasks, be specific about the language, framework, and expected behavior:

```bash
opencode run "create a REST API with Express.js that has CRUD endpoints for a Todo model"
```

### Create your first file

Generate a hello world script and save it to a file:

```bash
opencode run "write a hello world script in Python that prints 'Hello, OpenCode!'" > hello.py
python3 hello.py
```

Try other languages:

```bash
opencode run "write hello world in JavaScript"
opencode run "write hello world in Go with an HTTP server"
```
