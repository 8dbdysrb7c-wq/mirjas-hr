import sys

def search_file(filepath, queries):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines):
            for query in queries:
                if query in line:
                    print(f"Line {i+1}: {line.strip()}")
    except Exception as e:
        print(f"Error: {e}")

search_file('src/pages/admin/AdminReports.jsx', ['timeOut', 'attendanceLogs', 'hrAttendance'])
search_file('src/pages/admin/AdminSupervisorReports.jsx', ['const empDailyReport =', 'timeIn', 'timeOut'])
