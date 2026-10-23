import os
import subprocess
import sys

def main():
    print("=== بدء تحديث النظام ===")
    
    # ضمان توفر Node.js و npm من المسار المحلي إذا لم تكن مضافة للبيئة العامة
    import glob
    candidates = [
        r"C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin",
        *glob.glob(r"C:\Users\HP\AppData\Local\OpenAI\Codex\runtimes\cua_node\*\bin")
    ]
    for nb in candidates:
        if os.path.exists(nb) and nb not in os.environ.get("PATH", ""):
            os.environ["PATH"] = nb + os.pathsep + os.environ.get("PATH", "")
            break

    print("\n[1/2] جاري بناء نسخة الإنتاج (Building production)...")
    build_result = subprocess.run("npm run build", shell=True)
    if build_result.returncode != 0:
        print("حدث خطأ أثناء عملية البناء (Build Failed). يرجى التأكد من تثبيت Node.js.")
        sys.exit(1)
        
    print("\n[2/2] جاري رفع التحديثات إلى الموقع (Deploying to Firebase)...")
    deploy_result = subprocess.run("npx firebase deploy --only hosting", shell=True)
    if deploy_result.returncode != 0:
        # Fallback to direct firebase command if npx firebase fails
        deploy_result_2 = subprocess.run("firebase deploy --only hosting", shell=True)
        if deploy_result_2.returncode != 0:
            print("حدث خطأ أثناء الرفع للموقع (Deploy Failed).")
            sys.exit(1)
            
    print("\n=== تمت العملية بنجاح! تم رفع جميع التحديثات للموقع. ===")

if __name__ == "__main__":
    main()
