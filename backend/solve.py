import ddddocr # type: ignore
import sys
import base64
import json

def solve():
    try:
        b64 = sys.argv[1]
        img_bytes = base64.b64decode(b64)
        ocr = ddddocr.DdddOcr(show_ad=False)
        res = ocr.classification(img_bytes)
        print(json.dumps({"success": True, "text": res}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    solve()
