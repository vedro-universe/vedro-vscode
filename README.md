# Vedro Extension for VSCode

Alpha version of the VS Code extension for the [Vedro](https://vedro.io/) testing framework. This extension allows you to execute Vedro scenarios directly from your workspace by simply clicking the green triangle next to the `Scenario` declaration.

## Test Explorer

Vedro scenarios are grouped by directory and file in the VS Code Testing view:

```text
my-project/
└── scenarios/
    └── feature/
        └── example_scenario.py
            └── Scenario
```

When a workspace folder is available, it is shown as the top-level item. You can run or debug the entire workspace test root, a directory, a file, or an individual scenario from the corresponding tree item.

## Requirements

- **Python**: Vedro framework installed in your Python environment
- **For Debug Profile**:
  - `debugpy` module: `pip install debugpy`
  - Python Debugger extension installed in VS Code
