import re

with open("src/pages/SchoolPrintReports.tsx", "r") as f:
    content = f.read()

content = content.replace("{incident.summary}", "{incident?.summary || 'No summary provided.'}")

with open("src/pages/SchoolPrintReports.tsx", "w") as f:
    f.write(content)
print("Updated SchoolPrintReports.tsx")
