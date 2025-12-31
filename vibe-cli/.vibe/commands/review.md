---
name: review
description: Code review with specific focus areas
args:
  - name: file
    required: true
  - name: focus
    default: "bugs,security,performance"
---

Review the file `$file` with focus on: $focus

Provide:
1. Critical issues found
2. Suggestions for improvement
3. Overall code quality assessment (1-10)

Be concise and actionable.
