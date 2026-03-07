import re

with open("src/pages/AcademicProgressDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace("c => String(c.student_id) === selectedId", "c => c.student_id?.toString() === selectedId")
content = content.replace("g => String(g.student_id) === selectedId", "g => g.student_id?.toString() === selectedId")
content = content.replace("s => String(s.student_id) === selectedId", "s => s.student_id?.toString() === selectedId")

content = content.replace("c => String(c.student_id) === String(y.id)", "c => c.student_id?.toString() === y.id?.toString()")
content = content.replace("g => String(g.student_id) === String(y.id)", "g => g.student_id?.toString() === y.id?.toString()")
content = content.replace("s => String(s.student_id) === String(y.id)", "s => s.student_id?.toString() === y.id?.toString()")

with open("src/pages/AcademicProgressDashboard.tsx", "w") as f:
    f.write(content)
print("Updated AcademicProgressDashboard.tsx")
