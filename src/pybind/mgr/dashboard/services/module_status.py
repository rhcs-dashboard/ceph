# -*- coding: utf-8 -*-
"""Helpers for dashboard pages that need a manager module or a service."""

from typing import Any, Dict, Optional

from .. import mgr


def mgr_module_state(module_name: str) -> str:
    """Return ``enabled``, ``disabled``, or ``unknown``.

    ``unknown`` means the manager map could not be read, or this cluster
    does not ship that module. Callers should keep the existing page in
    that case instead of offering an Enable button for a module that
    cannot be turned on.
    """
    try:
        mgr_map = mgr.get('mgr_map')
    except Exception:  # pylint: disable=broad-except
        return 'unknown'
    if not isinstance(mgr_map, dict):
        return 'unknown'

    available = []
    for entry in mgr_map.get('available_modules') or []:
        if isinstance(entry, dict) and entry.get('name'):
            available.append(entry['name'])
        elif isinstance(entry, str):
            available.append(entry)
    if module_name not in available:
        return 'unknown'

    release = getattr(mgr, 'release_name', None)
    always_on_map = mgr_map.get('always_on_modules') or {}
    always_on = []
    if isinstance(always_on_map, dict):
        release_modules = always_on_map.get(release) if release else None
        if isinstance(release_modules, (list, tuple, set)):
            always_on = list(release_modules)
        else:
            for value in always_on_map.values():
                if isinstance(value, (list, tuple, set)) and module_name in value:
                    return 'enabled'

    modules = mgr_map.get('modules') or []
    if not isinstance(modules, (list, tuple, set)):
        return 'unknown'
    if module_name in modules or module_name in always_on:
        return 'enabled'
    return 'disabled'


def unavailable(message: str,
                reason: str,
                module: Optional[str] = None) -> Dict[str, Any]:
    status: Dict[str, Any] = {
        'available': False,
        'message': message,
        'reason': reason,
    }
    if module:
        status['module'] = module
    return status
