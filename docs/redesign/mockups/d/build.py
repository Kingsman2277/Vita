import re,sys
sb=open('d/sb.html').read()
for n in ['d1','d2','d3','d4']:
    try: s=open(f'd/{n}.src.html').read()
    except FileNotFoundError: continue
    s=s.replace('{{SB}}',sb)
    for k in 'hmb': s=s.replace('{{NAV_%s}}'%k,open(f'd/nav-{k}.html').read())
    name={'d1':'d1-home','d2':'d2-money','d3':'d3-workout','d4':'d4-quickadd'}[n]
    open(f'{name}.html','w').write(s)
