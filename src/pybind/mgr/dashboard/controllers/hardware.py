
from typing import Any, Dict, List, Optional

from ..services.hardware import HardwareService
from ..services.orchestrator import OrchClient
from . import APIDoc, APIRouter, EndpointDoc, RESTController
from ._version import APIVersion


@APIRouter('/hardware')
@APIDoc("Hardware management API", "Hardware")
class Hardware(RESTController):
    """
    Hardware management REST API controller.

    Provides endpoints to query hardware status from ceph orchestrator node-proxy.
    """

    @RESTController.Collection('GET', version=APIVersion.EXPERIMENTAL)
    @EndpointDoc("Retrieve a summary of the hardware health status")
    def summary(self, categories: Optional[List[str]] = None, hostname: Optional[List[str]] = None):
        """
        Get hardware health status summary.

        Returns aggregated counts of OK/Error components per category.

        Args:
            categories: Hardware categories to query (storage, memory, processors, network, power, fans)
                       If None, queries all categories.
            hostname: Filter results to specific hosts. If None, returns all hosts.

        Returns:
            Dictionary with total counts per category and per-host health status.
        """
        return HardwareService.get_summary(categories, hostname)

    @RESTController.Collection('GET', version=APIVersion.EXPERIMENTAL)
    @EndpointDoc("Retrieve detailed hardware device information")
    def devices(self, categories: Optional[List[str]] = None, hostname: Optional[str] = None):
        """
        Get detailed hardware device information.

        Returns flattened list of all hardware devices with full details
        (models, capacities, serial numbers, health status, etc.)

        Args:
            categories: Hardware categories to query. If None, queries all standard categories.
            hostname: Filter results to specific host. If None, returns all hosts.

        Returns:
            Dictionary mapping category names to lists of device dictionaries.
            Each device includes hostname, component_id, and category-specific fields.
        """
        return HardwareService.get_devices(categories, hostname)


@APIRouter('/hardware/grafana', secure=False)
@APIDoc("Grafana JSON API datasource endpoints", "HardwareGrafana")
class HardwareGrafana(RESTController):
    """
    Grafana JSON API datasource plugin endpoints.

    Implements the Grafana SimpleJson datasource protocol to enable
    querying hardware data directly from Grafana dashboards.

    Note: secure=False because Grafana datasource plugin makes unauthenticated requests.

    See: https://grafana.com/grafana/plugins/grafana-simple-json-datasource/
    """

    @RESTController.Resource('GET')
    def health(self):
        """
        Health check endpoint for Grafana datasource connection test.

        Returns:
            Dictionary with status: 'OK' if the API is reachable.
        """
        return {'status': 'OK'}

    @RESTController.Collection('POST')
    def search(self, target: Optional[str] = None):
        """
        Return available metric targets for Grafana query builder.

        Called by Grafana when building queries to populate the target dropdown.

        Args:
            target: Optional filter parameter (unused, for SimpleJson protocol compatibility)

        Returns:
            List of available target names that can be queried.
        """
        return [
            'summary',
            'storage_devices',
            'processors',
            'memory_dimms',
            'network_adapters',
            'power_supplies',
            'fans',
            'firmwares',
            'criticals'
        ]

    @RESTController.Collection('POST')
    def query(self, targets: List[Dict[str, Any]], range: Dict[str, str], **kwargs):
        """
        Main query endpoint for Grafana panels.

        Handles data queries from Grafana dashboards. Transforms node-proxy
        hardware data into Grafana table format with appropriate columns.

        Request format:
        {
            'targets': [
                {'target': 'storage_devices', 'refId': 'A', 'type': 'table'}
            ],
            'range': {'from': '...', 'to': '...'}
        }

        Response format (table):
        [{
            'target': 'storage_devices',
            'type': 'table',
            'columns': [
                {'text': 'hostname', 'type': 'string'},
                {'text': 'model', 'type': 'string'},
                ...
            ],
            'rows': [
                ['at3n2.tuc.stglabs.ibm.com', 'Micron_2550', ...],
                ...
            ]
        }]
        """
        results = []

        for target_obj in targets:
            target = target_obj.get('target')
            ref_id = target_obj.get('refId', 'A')

            if target == 'storage_devices':
                data = HardwareService.get_devices(['storage'])
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'component_id', 'type': 'string'},
                    {'text': 'model', 'type': 'string'},
                    {'text': 'capacity_gb', 'type': 'number'},
                    {'text': 'protocol', 'type': 'string'},
                    {'text': 'serial_number', 'type': 'string'},
                    {'text': 'health', 'type': 'string'},
                    {'text': 'state', 'type': 'string'}
                ]
                rows = [
                    [
                        d['hostname'],
                        d['component_id'],
                        d.get('model', 'N/A'),
                        round(d.get('capacity_bytes', 0) / 1e9, 2),
                        d.get('protocol', 'N/A'),
                        d.get('serial_number', 'N/A'),
                        d.get('health', 'Unknown'),
                        d.get('state', 'Unknown')
                    ]
                    for d in data.get('storage', [])
                ]

            elif target == 'processors':
                data = HardwareService.get_devices(['processors'])
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'component_id', 'type': 'string'},
                    {'text': 'manufacturer', 'type': 'string'},
                    {'text': 'cores', 'type': 'number'},
                    {'text': 'threads', 'type': 'number'},
                    {'text': 'health', 'type': 'string'},
                    {'text': 'state', 'type': 'string'}
                ]
                rows = [
                    [
                        d['hostname'],
                        d['component_id'],
                        d.get('manufacturer', 'N/A'),
                        d.get('total_cores', 0),
                        d.get('total_threads', 0),
                        d.get('health', 'Unknown'),
                        d.get('state', 'Unknown')
                    ]
                    for d in data.get('processors', [])
                ]

            elif target == 'memory_dimms':
                data = HardwareService.get_devices(['memory'])
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'component_id', 'type': 'string'},
                    {'text': 'type', 'type': 'string'},
                    {'text': 'capacity_mib', 'type': 'number'},
                    {'text': 'health', 'type': 'string'},
                    {'text': 'state', 'type': 'string'}
                ]
                rows = [
                    [
                        d['hostname'],
                        d['component_id'],
                        d.get('memory_device_type', 'N/A'),
                        d.get('capacity_mi_b', 0),
                        d.get('health', 'Unknown'),
                        d.get('state', 'Unknown')
                    ]
                    for d in data.get('memory', [])
                ]

            elif target == 'network_adapters':
                data = HardwareService.get_devices(['network'])
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'component_id', 'type': 'string'},
                    {'text': 'name', 'type': 'string'},
                    {'text': 'health', 'type': 'string'},
                    {'text': 'state', 'type': 'string'}
                ]
                rows = [
                    [
                        d['hostname'],
                        d['component_id'],
                        d.get('name', 'N/A'),
                        d.get('health', 'Unknown'),
                        d.get('state', 'Unknown')
                    ]
                    for d in data.get('network', [])
                ]

            elif target == 'power_supplies':
                data = HardwareService.get_devices(['power'])
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'component_id', 'type': 'string'},
                    {'text': 'name', 'type': 'string'},
                    {'text': 'health', 'type': 'string'},
                    {'text': 'state', 'type': 'string'}
                ]
                rows = [
                    [
                        d['hostname'],
                        d['component_id'],
                        d.get('name', 'N/A'),
                        d.get('health', 'Unknown'),
                        d.get('state', 'Unknown')
                    ]
                    for d in data.get('power', [])
                ]

            elif target == 'fans':
                data = HardwareService.get_devices(['fans'])
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'component_id', 'type': 'string'},
                    {'text': 'name', 'type': 'string'},
                    {'text': 'health', 'type': 'string'},
                    {'text': 'state', 'type': 'string'}
                ]
                rows = [
                    [
                        d['hostname'],
                        d['component_id'],
                        d.get('name', 'N/A'),
                        d.get('health', 'Unknown'),
                        d.get('state', 'Unknown')
                    ]
                    for d in data.get('fans', [])
                ]

            elif target == 'firmwares':
                data = HardwareService.get_devices(['firmwares'])
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'type', 'type': 'string'},
                    {'text': 'version', 'type': 'string'},
                    {'text': 'updateable', 'type': 'boolean'}
                ]
                rows = [
                    [
                        d['hostname'],
                        d['firmware_type'],
                        d.get('version', 'unknown'),
                        d.get('updateable', False)
                    ]
                    for d in data.get('firmwares', [])
                ]

            elif target == 'summary':
                summary = HardwareService.get_summary_raw()
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'category', 'type': 'string'},
                    {'text': 'status', 'type': 'string'}
                ]
                rows = []
                for host, host_data in summary.items():
                    status = host_data.get('status', {})
                    for category, stat in status.items():
                        if category != 'firmwares':
                            rows.append([host, category, stat])

            elif target == 'criticals':
                # For criticals, we need to call the node-proxy criticals category
                orch_hardware = OrchClient.instance().hardware
                raw_data = orch_hardware.common(category='criticals')
                columns = [
                    {'text': 'hostname', 'type': 'string'},
                    {'text': 'category', 'type': 'string'},
                    {'text': 'critical_count', 'type': 'number'}
                ]
                rows = []
                for host, systems in raw_data.items():
                    for sys_id, categories in systems.items():
                        for cat, criticals in categories.items():
                            rows.append([host, cat, len(criticals)])

            else:
                # Unknown target
                columns = []
                rows = []

            results.append({
                'target': target,
                'refId': ref_id,
                'type': 'table',
                'columns': columns,
                'rows': rows
            })

        return results
