#!/usr/bin/env python
import os, sys
# Bootstrap the small optional Django gateway project.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gateway.settings")
from django.core.management import execute_from_command_line
execute_from_command_line(sys.argv)
