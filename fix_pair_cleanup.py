from pathlib import Path
import subprocess
root=Path('faust-reader')
for file in ['chapter-02.html','chapter-03.html','dist/chapter-02.html','dist/chapter-03.html']:
 data=subprocess.check_output(['git','-c','safe.directory='+str(root.resolve()).replace('\\','/'),'-C',str(root),'show','ac4caba:'+file]);(root/file).write_bytes(data)
p=root/'repair_bilingual_pairs.py';s=p.read_text(encoding='utf-8-sig');s=s.replace("r'<details class=\"source-fold\"><summary>.*?</summary>\\s*</details>'","r'<details class=\"source-fold\"><summary>[^<]*</summary>\\s*</details>'");p.write_text(s,encoding='utf-8')
