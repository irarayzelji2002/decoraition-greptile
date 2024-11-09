import subprocess
import os
import signal
import psutil
import time
import sys

# Define the path and arguments
PAGEKITE_PATH = r'C:\Users\Ira\Documents\CodingProjects\Visual Studio Code Projects\decoraition\decoraition\ai-api\pagekite.py'
PORT = '8080'
SUBDOMAIN = 'irarayzelji.pagekite.me'
SCRIPT_PATH = PAGEKITE_PATH
LOCK_FILE = r'C:\Users\Ira\Documents\CodingProjects\Visual Studio Code Projects\decoraition\decoraition\ai-api\pagekite-update.lock'

# Python executable to use
PYTHON_EXECUTABLE = 'py -2.7'

def find_python_executable_for_pagekite():
    """Find if the specified Python executable is currently running Pagekite."""
    for proc in psutil.process_iter(['pid', 'cmdline']):
        try:
            cmdline = proc.info['cmdline']
            if isinstance(cmdline, list):
                cmdline_str = ' '.join(cmdline)
                if SCRIPT_PATH in cmdline_str and PYTHON_EXECUTABLE.split()[0] in cmdline_str:
                    return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    return None

def start_pagekite():
    """Start Pagekite with specified Python executable."""
    print("========Starting Pagekite...========")
    return subprocess.Popen([PYTHON_EXECUTABLE.split()[0], '-2.7', SCRIPT_PATH, PORT, SUBDOMAIN])

def restart_pagekite(proc):
    """Restart Pagekite."""
    if proc:
        print(f"========Stopping Pagekite with PID {proc.pid}...========")
        proc.terminate()  # Properly terminate the process
        proc.wait()  # Wait for the process to terminate
        print(f"========Stopped Pagekite with PID {proc.pid}========")
        time.sleep(5)  # Wait for a few seconds before restarting
    return start_pagekite()

def create_lock_file():
    """Create a lock file to indicate that the script is running."""
    with open(LOCK_FILE, 'w') as f:
        f.write(f"{os.getpid()}")

def remove_lock_file():
    """Remove the lock file."""
    if os.path.exists(LOCK_FILE):
        os.remove(LOCK_FILE)

def check_lock_file():
    """Check if the lock file exists and if so, if it is stale."""
    if os.path.exists(LOCK_FILE):
        with open(LOCK_FILE, 'r') as f:
            pid = int(f.read().strip())
        try:
            proc = psutil.Process(pid)
            if proc.is_running():
                return True  # The existing script is still running
        except psutil.NoSuchProcess:
            return False  # The process is not running anymore
    return False

if __name__ == "__main__":
    if check_lock_file():
        print("========Another instance of pagekite-update.py is running. Stopping it...========")
        # Attempt to find and terminate the existing instance
        existing_proc = find_python_executable_for_pagekite()
        if existing_proc:
            try:
                existing_proc.terminate()
                existing_proc.wait()
                print("========Stopped by new instance of pagekite-update.py========")
            except psutil.NoSuchProcess:
                print("========Existing instance not found.========")
        sys.exit()

    create_lock_file()

    pagekite_process = None
    try:
        print("========Running script...========")
        pagekite_process = find_python_executable_for_pagekite()
        if pagekite_process:
            pagekite_process = restart_pagekite(pagekite_process)
        else:
            pagekite_process = start_pagekite()

        # Handle Ctrl+C to properly terminate Pagekite
        while True:
            time.sleep(1)  # Keep the script running
    except KeyboardInterrupt:
        print("========Interrupted by user.========")
    finally:
        if pagekite_process:
            print("========Stopping Pagekite...========")
            pagekite_process.terminate()
            pagekite_process.wait()
            print("========Stopped Pagekite.========")
        remove_lock_file()
        print("========Script execution finished.========")
