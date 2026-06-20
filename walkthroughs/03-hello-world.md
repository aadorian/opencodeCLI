## Hello World with OpenCode

Create your first file using OpenCode. Run this inline command:

```bash
opencode "write a hello world script in Python"
```

OpenCode will generate the code and output it in your terminal. To write it directly to a file:

```bash
opencode "write a hello world script in Python that prints 'Hello, OpenCode!'" > hello.py
```

Now run it:

```bash
python3 hello.py
```

### Try More Languages

```bash
opencode "write hello world in JavaScript"
opencode "write hello world in Go with an HTTP server"
opencode "write hello world in Rust using cargo"
```

### With File Context

Navigate to your project and ask OpenCode to read the current context:

```bash
opencode "add a hello endpoint to the existing server"
```

OpenCode understands your project's language and framework based on the files present.
