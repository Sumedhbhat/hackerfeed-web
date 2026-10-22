"""Forward step cancellation once, and wait for child cleanup before exiting."""
import os
import signal
import subprocess


class Commands:
    def __enter__(self):
        self.child = None
        self.interrupted = 0
        self.finishing = False
        self.spawning = False
        self.forwarded = False
        self.previous = {sig: signal.signal(sig, self.stop)
                         for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}
        return self

    def stop(self, signum, _frame):
        # A second Terraform interrupt skips graceful state save/unlock. The
        # runner may escalate INT to TERM; keep waiting through that escalation.
        if self.interrupted:
            return
        self.interrupted = signum
        self.forward()
        if self.child is None and not self.finishing and not self.spawning:
            raise SystemExit(128 + signum)

    def forward(self):
        if self.interrupted and not self.forwarded and self.child is not None:
            self.forwarded = True
            try:
                self.child.send_signal(signal.SIGTERM)
            except ProcessLookupError:
                pass

    def run(self, arguments, *, check=False, **kwargs):
        if self.interrupted:
            raise SystemExit(128 + self.interrupted)
        # Defer forwarding during spawn until the child PID is registered.
        self.spawning = True
        self.forwarded = False
        try:
            self.child = subprocess.Popen(arguments, start_new_session=True, **kwargs)
        finally:
            self.spawning = False
        self.forward()
        stdout, stderr = self.child.communicate()
        result = subprocess.CompletedProcess(arguments, self.child.returncode, stdout, stderr)
        # Terraform has now finished saving state and unlocking. A local-exec
        # shell can leave its own children behind when Terraform cancels it;
        # clean that isolated group only AFTER Terraform's graceful exit.
        try:
            os.killpg(self.child.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        self.child = None
        if self.interrupted:
            raise SystemExit(128 + self.interrupted)
        if check:
            result.check_returncode()
        return result

    def output(self, arguments):
        return self.run(arguments, stdout=subprocess.PIPE, check=True).stdout

    def __exit__(self, exception_type, *_args):
        for sig, handler in self.previous.items():
            signal.signal(sig, handler)
        if self.interrupted and exception_type is None:
            raise SystemExit(128 + self.interrupted)
