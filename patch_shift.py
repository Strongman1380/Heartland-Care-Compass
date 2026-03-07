import re

with open("src/pages/ShiftScores.tsx", "r") as f:
    content = f.read()

new_block = """  // ── Match youth by name ──
  const matchYouthLocal = (nameVal: string) => {
    const lower = nameVal.toLowerCase().trim()
    return sortedYouths.find(y => {
      const f = (y.firstName || '').toLowerCase().trim()
      const l = (y.lastName || '').toLowerCase().trim()
      const full = f + ' ' + l
      return f === lower || l === lower || full === lower || full.includes(lower)
    })
  }"""

old_block = """  // ── Match youth by name ──
  const matchYouth = (nameVal: string) => {
    const lower = nameVal.toLowerCase().trim()
    return sortedYouths.find(y =>
      y.firstName.toLowerCase() === lower ||
      `${y.firstName} ${y.lastName}`.toLowerCase() === lower ||
      y.lastName.toLowerCase() === lower
    )
  }"""

content = content.replace(old_block, new_block)
content = content.replace("const matched = matchYouth(nameVal)", "const matched = matchYouimport re

with open("src/pag("
with ops/ShiftScores.tsx", "w") as f:
    f.write(content)
