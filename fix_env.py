import re

for filename in ["scripts/generate-sample-school-data.js", "scripts/check-school-data.js"]:
    with open(filename, "r") as f:
        content = f.read()
    
    content = content.replace("join(__dirname, '.env.local')", "join(__dirname, '..', '.env.local')")
    content = content.replace("join(__dirname, '.env')", "join(__dirname, '..', '.env')")

    with open(filename, "w") as f:
        f.write(content)
print("Updated .env paths")
