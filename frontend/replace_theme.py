import os
import re

def replace_colors(directory):
    replacements = {
        r'blue-600': 'slate-900',
        r'blue-500': 'slate-700',
        r'blue-700': 'slate-950',
        r'blue-400': 'slate-500',
        r'blue-50': 'slate-50',
        r'blue-100': 'slate-100',
        r'blue-200': 'slate-200',
        r'text-blue-': 'text-slate-',
        r'bg-blue-': 'bg-slate-',
        r'border-blue-': 'border-slate-',
        r'ring-blue-': 'ring-slate-',
        r'hover:bg-blue-': 'hover:bg-slate-',
        r'hover:text-blue-': 'hover:text-slate-',
    }

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js') or file.endswith('.css'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for pattern, replacement in replacements.items():
                    new_content = re.sub(pattern, replacement, new_content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")

if __name__ == "__main__":
    replace_colors('src')
