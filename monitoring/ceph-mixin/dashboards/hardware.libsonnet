local g = import 'grafonnet/grafana.libsonnet';
local text = import 'grafonnet/text.libsonnet';

(import 'utils.libsonnet') {
  'hardware.json':
    $.dashboardSchema(
      'Ceph Hardware Monitoring (Node-Proxy)',
      'Hardware monitoring via ceph orch hardware status',
      'hardware001',
      'now-1h',
      '30s',
      16,
      $._config.dashboardTags + ['hardware'],
      ''
    )
    .addTemplate(
      g.template.datasource(
        'datasource',
        'prometheus',
        'default',
        label='Data Source'
      )
    )
    .addPanels([
      // Row 1: Overview and Setup Instructions
      $.addRowSchema(collapse=false, showTitle=true, title='Overview') + { gridPos: { x: 0, y: 0, w: 24, h: 1 } },

      // Information panel explaining the integration
      text.new(
        'Hardware Dashboard - Node-Proxy Integration',
        content=|||
          ## Ceph Hardware Monitoring Dashboard

          This dashboard provides hardware status from the node-proxy API (ceph orch hardware status).

          ### Backend API Endpoints

          New endpoints added for Grafana JSON API datasource:
          - /api/hardware/devices - Detailed device information
          - /api/hardware/grafana/health - Connection health check
          - /api/hardware/grafana/search - Available metrics
          - /api/hardware/grafana/query - Query endpoint for panels

          ### Available Data Categories

          **Storage** - Drive models, capacities, protocols, health status
          **Processors** - CPU cores, threads, manufacturer, health
          **Memory** - DIMM types, capacities, health
          **Network** - Network adapters, health status
          **Power** - Power supply status
          **Fans** - Fan health (no RPM speeds)
          **Firmware** - BIOS/BMC/CPLD versions
          **Component Health** - Overall status per category
          **Criticals** - Critical hardware alerts

          ### Grafana Configuration Required

          To use this dashboard:
          1. Install Grafana JSON API datasource plugin
          2. Configure datasource to point to: http://<ceph-mgr>:11000/api/hardware/grafana
          3. Import this dashboard JSON
          4. Select the JSON datasource

          ### Testing Backend API

          Test connection:
          curl http://localhost:11000/api/hardware/grafana/health

          Get storage devices:
          curl http://localhost:11000/api/hardware/devices?categories=storage

          Query via Grafana endpoint:
          curl -X POST http://localhost:11000/api/hardware/grafana/query \
            -H 'Content-Type: application/json' \
            -d '{"targets":[{"target":"storage_devices","refId":"A","type":"table"}]}'
        |||,
        mode='markdown'
      ) + { gridPos: { x: 0, y: 1, w: 12, h: 18 } },

      // Known limitations panel
      text.new(
        'Known Limitations',
        content=|||
          ## Data NOT Available from Node-Proxy

          The following metrics are NOT available via ceph orch hardware status:

          **Temperature sensors** (CPU, DIMM, NVMe, motherboard)
          **Fan speed (RPM)** values
          **Time-series historical data** (node-proxy provides snapshots only)

          ### Why?

          Node-proxy provides configuration and status (what hardware exists, is it healthy),
          not real-time sensor readings (temperatures, fan speeds).

          ### Alternative: Atollon Exporter

          To get temperature/fan speed metrics, use the Atollon hardware exporter:
          - Provides Prometheus metrics: atollon_hardware_temperature_sensor_celsius, atollon_fan_speed_rpm
          - Enables historical time-series graphs
          - Compatible with existing atollon.json dashboard panels

          ### This Dashboard Shows

          Hardware inventory (models, capacities, serial numbers)
          Health status (OK, Warning, Error per component)
          Firmware versions
          Component states (Enabled, Absent, etc.)

          Not real-time sensor values or historical trends.
        |||,
        mode='markdown'
      ) + { gridPos: { x: 12, y: 1, w: 12, h: 18 } },

      // Row 2: Implementation Status
      $.addRowSchema(collapse=false, showTitle=true, title='Implementation Status') + { gridPos: { x: 0, y: 19, w: 24, h: 1 } },

      // Backend API status
      text.new(
        'Backend API - Completed',
        content=|||
          ## Backend Python API Extensions

          ### services/hardware.py
          - get_devices() - Flatten node-proxy data for Grafana
          - get_summary_raw() - Raw summary endpoint

          ### controllers/hardware.py
          - /api/hardware/devices - New devices endpoint
          - /api/hardware/grafana/health - Health check
          - /api/hardware/grafana/search - Metric list
          - /api/hardware/grafana/query - Query handler

          ### Supported Targets
          - storage_devices
          - processors
          - memory_dimms
          - network_adapters
          - power_supplies
          - fans
          - firmwares
          - summary
          - criticals

          All targets return Grafana table format with appropriate columns.
        |||,
        mode='markdown'
      ) + { gridPos: { x: 0, y: 20, w: 12, h: 14 } },

      // Dashboard status and next steps
      text.new(
        'Dashboard Configuration',
        content=|||
          ## Dashboard Setup

          ### Current Status
          - Basic libsonnet structure created
          - Added to dashboards.libsonnet build manifest
          - Panels require Grafana JSON datasource configured

          ### Next Steps

          1. Install JSON Datasource Plugin in Grafana
             grafana-cli plugins install grafana-simple-json-datasource

          2. Configure Datasource
             - URL: http://<ceph-mgr-host>:11000/api/hardware/grafana
             - Access: Server (default)
             - No authentication required (secure=False in controller)

          3. Build Full Dashboard Panels
             - Create table panels for each category
             - Add pie charts for firmware versions
             - Add stat panels for health counters
             - Match atollon.json structure where data available

          ### Testing Without Full Dashboard

          Use curl to test the API directly (see left panel for commands).

          ### Data Flow

          Grafana JSON Datasource
          -> /api/hardware/grafana/query
          -> HardwareService.get_devices()
          -> OrchClient.hardware.common()
          -> ceph orch hardware status
        |||,
        mode='markdown'
      ) + { gridPos: { x: 12, y: 20, w: 12, h: 14 } },

      // Row 3: Hardware Data Tables
      $.addRowSchema(collapse=true, showTitle=true, title='Storage Devices') + { gridPos: { x: 0, y: 34, w: 24, h: 1 } },

      // Storage devices table - Raw panel JSON for JSON API datasource
      {
        datasource: {
          type: 'grafana-simple-json-datasource',
          uid: '${datasource}'
        },
        fieldConfig: {
          defaults: {
            custom: {
              align: 'auto',
              cellOptions: {
                type: 'auto'
              },
              inspect: false
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 10,
          w: 24,
          x: 0,
          y: 35
        },
        id: 100,
        options: {
          cellHeight: 'sm',
          footer: {
            countRows: false,
            fields: '',
            reducer: ['sum'],
            show: false
          },
          showHeader: true
        },
        pluginVersion: '9.4.7',
        targets: [
          {
            refId: 'A',
            target: 'storage_devices',
            type: 'table'
          }
        ],
        title: 'Storage Devices',
        type: 'table'
      },

      // Row 4: Processors
      $.addRowSchema(collapse=true, showTitle=true, title='Processors') + { gridPos: { x: 0, y: 45, w: 24, h: 1 } },

      // Processors table
      {
        datasource: {
          type: 'grafana-simple-json-datasource',
          uid: '${datasource}'
        },
        fieldConfig: {
          defaults: {
            custom: {
              align: 'auto',
              cellOptions: {
                type: 'auto'
              },
              inspect: false
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 24,
          x: 0,
          y: 46
        },
        id: 101,
        options: {
          cellHeight: 'sm',
          footer: {
            countRows: false,
            fields: '',
            reducer: ['sum'],
            show: false
          },
          showHeader: true
        },
        pluginVersion: '9.4.7',
        targets: [
          {
            refId: 'A',
            target: 'processors',
            type: 'table'
          }
        ],
        title: 'CPU Information',
        type: 'table'
      },

      // Row 5: Memory
      $.addRowSchema(collapse=true, showTitle=true, title='Memory') + { gridPos: { x: 0, y: 54, w: 24, h: 1 } },

      // Memory table
      {
        datasource: {
          type: 'grafana-simple-json-datasource',
          uid: '${datasource}'
        },
        fieldConfig: {
          defaults: {
            custom: {
              align: 'auto',
              cellOptions: {
                type: 'auto'
              },
              inspect: false
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 8,
          w: 24,
          x: 0,
          y: 55
        },
        id: 102,
        options: {
          cellHeight: 'sm',
          footer: {
            countRows: false,
            fields: '',
            reducer: ['sum'],
            show: false
          },
          showHeader: true
        },
        pluginVersion: '9.4.7',
        targets: [
          {
            refId: 'A',
            target: 'memory_dimms',
            type: 'table'
          }
        ],
        title: 'Memory DIMMs',
        type: 'table'
      },

      // Row 6: Firmware
      $.addRowSchema(collapse=true, showTitle=true, title='Firmware Versions') + { gridPos: { x: 0, y: 63, w: 24, h: 1 } },

      // Firmware table
      {
        datasource: {
          type: 'grafana-simple-json-datasource',
          uid: '${datasource}'
        },
        fieldConfig: {
          defaults: {
            custom: {
              align: 'auto',
              cellOptions: {
                type: 'auto'
              },
              inspect: false
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 6,
          w: 24,
          x: 0,
          y: 64
        },
        id: 103,
        options: {
          cellHeight: 'sm',
          footer: {
            countRows: false,
            fields: '',
            reducer: ['sum'],
            show: false
          },
          showHeader: true
        },
        pluginVersion: '9.4.7',
        targets: [
          {
            refId: 'A',
            target: 'firmwares',
            type: 'table'
          }
        ],
        title: 'Firmware Versions (BIOS/BMC/CPLD)',
        type: 'table'
      },

      // Row 7: Power and Fans
      $.addRowSchema(collapse=true, showTitle=true, title='Power & Cooling') + { gridPos: { x: 0, y: 70, w: 24, h: 1 } },

      // Power supplies table
      {
        datasource: {
          type: 'grafana-simple-json-datasource',
          uid: '${datasource}'
        },
        fieldConfig: {
          defaults: {
            custom: {
              align: 'auto',
              cellOptions: {
                type: 'auto'
              },
              inspect: false
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 6,
          w: 12,
          x: 0,
          y: 71
        },
        id: 104,
        options: {
          cellHeight: 'sm',
          footer: {
            countRows: false,
            fields: '',
            reducer: ['sum'],
            show: false
          },
          showHeader: true
        },
        pluginVersion: '9.4.7',
        targets: [
          {
            refId: 'A',
            target: 'power_supplies',
            type: 'table'
          }
        ],
        title: 'Power Supplies',
        type: 'table'
      },

      // Fans table
      {
        datasource: {
          type: 'grafana-simple-json-datasource',
          uid: '${datasource}'
        },
        fieldConfig: {
          defaults: {
            custom: {
              align: 'auto',
              cellOptions: {
                type: 'auto'
              },
              inspect: false
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null
                }
              ]
            }
          },
          overrides: []
        },
        gridPos: {
          h: 6,
          w: 12,
          x: 12,
          y: 71
        },
        id: 105,
        options: {
          cellHeight: 'sm',
          footer: {
            countRows: false,
            fields: '',
            reducer: ['sum'],
            show: false
          },
          showHeader: true
        },
        pluginVersion: '9.4.7',
        targets: [
          {
            refId: 'A',
            target: 'fans',
            type: 'table'
          }
        ],
        title: 'Fans (No RPM data available)',
        type: 'table'
      },

      // Row 8: API Testing Examples
      $.addRowSchema(collapse=true, showTitle=true, title='API Testing Examples') + { gridPos: { x: 0, y: 77, w: 24, h: 1 } },

      // Storage devices example
      text.new(
        'Storage Devices Query Example',
        content=|||
          ## Query Storage Devices

          ### Direct API Call
          curl http://localhost:11000/api/hardware/devices?categories=storage | jq

          ### Expected Response
          {
            "storage": [
              {
                "hostname": "at3n2.tuc.stglabs.ibm.com",
                "system_id": "Self",
                "component_id": "nvme_device0_nsid1",
                "model": "Micron_2550_MTFDKBK512TGE",
                "capacity_bytes": 512110190592,
                "protocol": "NVMe",
                "serial_number": "24424BAA3C40",
                "health": "OK",
                "state": "Enabled"
              }
            ]
          }

          ### Grafana Query Format
          {
            "targets": [
              {
                "target": "storage_devices",
                "refId": "A",
                "type": "table"
              }
            ],
            "range": {
              "from": "now-1h",
              "to": "now"
            }
          }
        |||,
        mode='markdown'
      ) + { gridPos: { x: 0, y: 78, w: 8, h: 12 } },

      // Firmware query example
      text.new(
        'Firmware Query Example',
        content=|||
          ## Query Firmware Versions

          ### Direct API Call
          curl http://localhost:11000/api/hardware/devices?categories=firmwares | jq

          ### Expected Response
          {
            "firmwares": [
              {
                "hostname": "at3n2.tuc.stglabs.ibm.com",
                "firmware_type": "bmc",
                "name": "BMC",
                "version": "0.50.d57cfd",
                "updateable": true,
                "status": "unknown"
              }
            ]
          }

          ### Grafana Query Format
          {
            "targets": [
              {
                "target": "firmwares",
                "refId": "B",
                "type": "table"
              }
            ]
          }
        |||,
        mode='markdown'
      ) + { gridPos: { x: 8, y: 78, w: 8, h: 12 } },

      // Health check example
      text.new(
        'Health Check Example',
        content=|||
          ## Grafana Datasource Health Check

          ### Test Endpoint
          curl http://localhost:11000/api/hardware/grafana/health

          ### Expected Response
          {
            "status": "OK"
          }

          ### Search Endpoint
          curl -X POST http://localhost:11000/api/hardware/grafana/search

          ### Expected Response
          [
            "summary",
            "storage_devices",
            "processors",
            "memory_dimms",
            "network_adapters",
            "power_supplies",
            "fans",
            "firmwares",
            "criticals"
          ]

          These are the available targets that can be queried
          in Grafana dashboard panels.
        |||,
        mode='markdown'
      ) + { gridPos: { x: 16, y: 78, w: 8, h: 12 } },
    ]),
}
