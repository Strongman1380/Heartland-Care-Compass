
import sys

def count_braces(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    braces = 0
    in_string = False
    string_char = ''
    escaped = False
    
    open_count = 0
    close_count = 0
    
    i = 0
    while i < len(content):
        char = content[i]
        
        if escaped:
            escaped = False
            i += 1
            continue
            
        if char == '\\':
            escaped = True
            i += 1
            continue
            
        if in_string:
            if char == string_char:
                in_string = False
            i += 1
            continue
            
        if char in ['"', "'", '`']:
            in_string = True
            string_char = char
            i += 1
            continue
            
        if char == '{':
            open_count += 1
        elif char == '}':
            close_count += 1
            
        i += 1
        
    return open_count, close_count

open_c, close_c = count_braces('/Users/brandonhinrichs/Local Repositories/Web Applications/Heartland-Care-Compass-main/src/components/referral/ReferralTab.tsx')
print(f"Open: {open_c}, Close: {close_c}")
