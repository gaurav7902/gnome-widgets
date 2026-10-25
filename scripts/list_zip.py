import zipfile
import sys

with zipfile.ZipFile(sys.argv[1]) as z:
    for name in z.namelist():
        print(name)
