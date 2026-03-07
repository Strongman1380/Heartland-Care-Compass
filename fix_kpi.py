import re

with open("src/components/dashboard/KpiDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace("c.student_id === youthId", "c.student_id?.toString() === youthId?.toString()")
content = content.replace("g.student_id === youthId", "g.student_id?.toString() === youthId?.toString()")
content = content.replace("s.student_id === youthId", "s.student_id?.toString() === youthId?.toString()")

with open("src/components/dashboard/KpiDashboard.tsx", "w") as f:
    f.write(content)
print("Updated KpiDashboard.tsx")
