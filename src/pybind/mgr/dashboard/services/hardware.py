

from typing import Any, Dict, List, Optional

from ..exceptions import DashboardException
from ..services.orchestrator import OrchClient


class HardwareService(object):

    @staticmethod
    def get_summary(categories: Optional[List[str]] = None,
                    hostname: Optional[List[str]] = None):
        total_count = {'total': 0, 'ok': 0, 'error': 0}

        output: Dict[str, Any] = {
            'total': {
                'category': {},
                'total': {}
            },
            'host': {
                'flawed': 0
            }
        }

        def count_ok(data: dict) -> int:
            return sum(
                component.get("status", {}).get("health") == "OK"
                for node in data.values()
                for system in node.values()
                for component in system.values()
            )

        def count_total(data: dict) -> int:
            return sum(
                len(component)
                for system in data.values()
                for component in system.values()
            )

        categories = HardwareService.validate_categories(categories)

        orch_hardware_instance = OrchClient.instance().hardware
        for category in categories:
            data = orch_hardware_instance.common(category, hostname)
            category_total = {
                'total': count_total(data),
                'ok': count_ok(data),
                'error': 0
            }

            for host, systems in data.items():
                output['host'].setdefault(host, {'flawed': False})
                if not output['host'][host]['flawed']:
                    for system in systems.values():
                        if any(dimm['status']['health'] != 'OK' for dimm in system.values()):
                            output['host'][host]['flawed'] = True
                            break

            category_total['error'] = max(0, category_total['total'] - category_total['ok'])
            output['total']['category'].setdefault(category, {})
            output['total']['category'][category] = category_total

            total_count['total'] += category_total['total']
            total_count['ok'] += category_total['ok']
            total_count['error'] += category_total['error']

        output['total']['total'] = total_count

        output['host']['flawed'] = sum(1 for host in output['host']
                                       if host != 'flawed' and output['host'][host]['flawed'])

        return output

    @staticmethod
    def get_devices(categories: Optional[List[str]] = None,
                    hostname: Optional[str] = None) -> Dict[str, List[Dict]]:
        """
        Flatten hardware device data from node-proxy for Grafana consumption.

        Args:
            categories: List of category names (storage, memory, processors, etc.)
            hostname: Optional hostname filter

        Returns:
            Dictionary mapping category names to lists of flattened device dictionaries.
            Example:
            {
                'storage': [
                    {
                        'hostname': 'host1',
                        'system_id': 'Self',
                        'component_id': 'nvme_device0_nsid1',
                        'model': 'Micron_2550_MTFDKBK512TGE',
                        'capacity_bytes': 512110190592,
                        'protocol': 'NVMe',
                        'serial_number': '24424BAA3C40',
                        'health': 'OK',
                        'state': 'Enabled'
                    }
                ]
            }
        """
        orch_hardware = OrchClient.instance().hardware
        result = {}

        # Default to all categories if not specified
        if not categories:
            categories = ['storage', 'processors', 'memory', 'network', 'power', 'fans']

        for category in categories:
            devices = []

            # Call node-proxy (returns nested dict: hostname -> sys_id -> component_id -> fields)
            raw_data = orch_hardware.common(category=category, hostname=hostname)

            # Flatten to list of devices
            for host, systems in raw_data.items():
                # Handle firmwares special structure (no sys_id level)
                if category == 'firmwares':
                    for fw_type, fw_data in systems.items():
                        devices.append({
                            'hostname': host,
                            'firmware_type': fw_type,
                            'name': fw_data.get('name'),
                            'version': fw_data.get('version'),
                            'updateable': fw_data.get('updateable'),
                            'status': fw_data.get('status')
                        })
                else:
                    for sys_id, components in systems.items():
                        for comp_id, fields in components.items():
                            device = {
                                'hostname': host,
                                'system_id': sys_id,
                                'component_id': comp_id
                            }

                            # Extract status fields
                            if 'status' in fields:
                                device['health'] = fields['status'].get('health', 'Unknown')
                                device['state'] = fields['status'].get('state', 'Unknown')

                            # Merge other fields (excluding 'status' to avoid duplication)
                            device.update({k: v for k, v in fields.items() if k != 'status'})
                            devices.append(device)

            result[category] = devices

        return result

    @staticmethod
    def get_summary_raw(hostname: Optional[str] = None) -> Dict:
        """
        Get overall hardware health summary from node-proxy.

        Returns node-proxy summary data including per-category status and firmware versions.
        This is the raw output from 'ceph orch hardware status --format json' (no --category).
        """
        orch_hardware = OrchClient.instance().hardware
        return orch_hardware.summary(hostname=hostname)

    @staticmethod
    def validate_categories(categories: Optional[List[str]]) -> List[str]:
        categories_list = ['memory', 'storage', 'processors',
                           'network', 'power', 'fans']

        if isinstance(categories, str):
            categories = [categories]
        elif categories is None:
            categories = categories_list
        elif not isinstance(categories, list):
            raise DashboardException(msg=f'{categories} is not a list',
                                     component='Hardware')
        if not all(item in categories_list for item in categories):
            raise DashboardException(msg=f'Invalid category, there is no {categories}',
                                     component='Hardware')

        return categories
