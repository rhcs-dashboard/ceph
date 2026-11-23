# Ceph Dashboard Service Management Modernization

| | |
| --- | --- |
| Document title | Ceph Dashboard Service Management Modernization |
| Component | Cluster → Services (`frontend/src/app/ceph/cluster/services`, `pybind/mgr/dashboard/controllers/service.py`) |
| Author | Puja Shahu |
| Status | Proposed / under review |
| Scope | What the page already does, then the form split, type metadata API, edit contract, and the remaining list-page bugs |

Cluster → Services lists cephadm services and creates or edits them. Creation of a placement-only service works. The form is still one component for every type, and edit still depends on cephadm merging a partial JSON spec into the stored spec.

## 1. What is already implemented

These behaviors are in the current tree. Later sections do not put them back.

### 1.1 Routes

Create and edit are pages. The modal outlet `services/(modal:create)` and `services/(modal:edit/:type/:name)` is gone.

```text
/services
/services/create
/services/create/<type>
/services/edit/<type>/<name>
/services/<service_name>/overview
```

`create` and `edit` are registered ahead of `:service_name`, so those words are not treated as a service name. `/services/create/nvmeof` opens Create with NVMe/TCP already selected and runs the same type setup as changing the dropdown.

The cluster-creation wizard still opens `ServiceFormComponent` with `ModalCdsService` (`routedModal` false) and passes `hiddenServices`. On a page, Cancel and a successful save call `Location.back()`. In the wizard, close dismisses the dialog.

The NVMe/TCP "not configured" action and the NFS form link navigate to `/services/create/nvmeof` and `/services/create`.

### 1.2 Create and edit page

The page uses the same narrow column as the other dashboard forms (`cdsCol` with `md: 4`).

```text
Details         type, service id, and the identity fields for that type
Deployment      unmanaged, hosts or label, count
Configuration   the rest of the fields for that type
```

Configuration is omitted for placement-only types such as Monitor and Manager, and for an unmanaged NFS service. For RGW, the Configuration heading stays visible when Unmanaged is checked, while the RGW fields are hidden. That heading is a second hardcoded type list and should disappear when the type form owns its own section.

### 1.3 Type menu and list labels

`service-type-catalog.ts` is the UI catalog. The create menu and the list Type column both read it. `GET /api/service/known_types` is still a list of strings. The UI groups that list locally.

The menu label is the readable name plus the service id, for example `iSCSI (iscsi)`. The submitted value is the service id.

| Group | Types |
| --- | --- |
| Block | iSCSI, NVMe/TCP, RBD mirror |
| File | CephFS mirror, MDS, NFS, SMB |
| Object | RGW |
| Observability | Alertmanager, Alloy, Ceph exporter, Elasticsearch, Grafana, Jaeger agent, Jaeger collector, Jaeger query, Jaeger tracing, Loki, Node exporter, Prometheus, Pushgateway, SNMP gateway |
| Cluster | Agent, Crash collector, Manager, Monitor |
| Administration | Ingress, Management gateway, Node proxy, OAuth2 Proxy |

OSD, container, and promtail stay out of the menu. OSD is created from the OSD page. Container is CLI-only. Promtail is replaced by Alloy. A type the API returns that is not in the catalog is listed under **Other**.

### 1.4 List columns

The list title is **Services**. The description is "Services deployed by the orchestrator. Create a service or follow an existing one."

| Column | What it shows |
| --- | --- |
| Service | Service name. The link opens `/services/<name>/overview`. Grafana, Prometheus, and Alertmanager keep the external-link icon. |
| Type | Readable name from the catalog, for example Alertmanager or Crash collector. |
| Status | Green **Running** when `running` equals `size` and `size` is greater than 0. Yellow **Warning** when `size` is 0 or `running` differs from `size`. |
| Placement | A sentence: `1 instance on any host`, `2 instances on any host`, `Hosts: osd-0, osd-1`, `Label: monitoring`, or `Unmanaged`. A count next to hosts or a label is shown in parentheses. |
| Running | Small `cds-tag` with `running / size`. Green when `running` equals `size` and `size` is greater than 0. Yellow on the same rows that show **Warning**. |
| Last Refreshed | Relative time |
| Ports | Listening ports, or `-` |
| Certificate Status | Certificate state when the service requires one, or `-` |

`placementText()` replaced `PlacementPipe`. A `host_pattern` that arrives as `{ pattern, pattern_type }` is not formatted, and a placement that has both hosts and a label shows only the hosts. The follow-up is to format `host_pattern` the way the NFS cluster page already does, and to keep count and label in the sentence.

The Status column is bound to `service_status`, which the service object does not have. The tag is computed in the template. Sorting that column does not follow Running versus Warning.

### 1.5 Fields each type still submits

The page posts the same spec the dialog posted. One `FormGroup` still declares every control.

| Type | Fields |
| --- | --- |
| mon, mgr, mds, crash, prometheus, alertmanager, and the other placement-only types | Service id when required, unmanaged, hosts or label, count. MDS keeps its id pattern. |
| grafana | Port and initial admin password, plus placement |
| rgw | Realm, zonegroup, zone, port, SSL, metrics, virtual host, QAT |
| ingress | Backend service, virtual IP, frontend port, monitor port, networks, SSL |
| nvmeof | Group, default RBD pool, mTLS certificates. Count stays hidden. |
| iscsi | Pool, API port, user, password, trusted IPs, SSL |
| nfs | SSL certificate, key, and CA |
| smb | Cluster id, config URI, features, DNS, join sources, user sources, Ceph users. The warning still points at the SMB page. |
| snmp-gateway | Version, destination, and v2c community or v3 engine, auth, and privacy |
| oauth2-proxy | Provider, client id and secret, issuer URL, addresses, domains, SSL |
| mgmt-gateway | Port, authentication, SSL protocols, ciphers. SSL stays on. |

## 2. Problem that remains

### 2.1 One form for every type

Current sizes: `service-form.component.ts` 1,981 lines, `service-form.component.html` 2,358 lines, `service-form.component.spec.ts` 1,355 lines.

One `FormGroup` declares the controls for RGW, NVMe-oF, iSCSI, NFS, ingress, SMB, SNMP, mgmt-gateway, oauth2-proxy, Grafana, MDS, and the placement-only types. Showing a field is an `@if` on `service_type`. Validating it is a `composeIf` on the same key. Saving it is a `switch (serviceType)` in `onSubmit()`. Loading an existing service is another type-specific patch in `ngOnInit`.

Adding a parameter means touching the form builder, the template, the loader, and the submit switch.

### 2.2 The same rules exist in Python and in TypeScript

`ServiceSpec.REQUIRES_SERVICE_ID` in `python-common/ceph/deployment/service_spec.py` is `container`, `ingress`, `iscsi`, `mds`, `nfs`, `nvmeof`, `rgw`, `smb`. The form repeats a shorter list in `isPrefixedNamedService`: `mds`, `rgw`, `nfs`, `iscsi`, `nvmeof`, `smb`, `ingress`. Container is absent there because the menu hides it.

`ServiceSpec.REQUIRES_CERTIFICATES` is a dict of `user_cert_allowed`, `scope`, and `requires_ca_cert`. The form repeats partial lists in `showExternalSslCert` and `showExternalSslKey`. Those lists omit `smb` and treat mgmt-gateway as a special case. `create()` drops `service_id` when the type is not in `REQUIRES_SERVICE_ID`. `set()` does not.

### 2.3 Edit merges a partial spec

`PUT /api/service/{service_name}` calls `OrchClient.instance().services.apply(service_spec, no_overwrite=False)`. Cephadm merges the JSON into the stored spec. A key the form leaves out keeps its old value. Turning a feature off persists only when `onSubmit()` writes `false` or removes the key.

NVMe-oF writes `enable_auth` from the mTLS checkbox. RGW deletes `qat` in the payload when compression is `none`. Other toggles follow whichever branch last touched them. A form that omits `enable_auth` reports success and leaves mTLS on. Clearing an inline certificate, or switching the source to cephadm-signed, leaves the old PEM in the spec when the key is absent from the payload. There is no `_keys_to_delete` field today.

The MDS edit path has a local workaround: the loader used to submit `mds.mds.<id>`. It now sets `service_id` from the stored spec and then disables it. That workaround lives in `ngOnInit` next to the other type patches.

### 2.4 List page behavior that is still coupled

- The Create action's `getDisable('create', selection)` line is commented out, so Create stays enabled when the orchestrator cannot create a service. Edit and Delete still call `getDisable`.
- Edit returns disabled for `osd` and `container` by comparing the type string inside `getDisable`. The reason is a boolean, so the row has no tooltip. The menu already hides those types.
- `getServices()` sets `isMgmtGateway` inside the filter that walks the current page, and a second check reads `this.services` outside that subscription. Pagination can flip the external-link target.
- `deleteAction()` already uses `TaskWrapperService`, then `delay(5000)` before the dialog observable completes, so the table does not still show the removed row. The delay is the race workaround.

## 3. Current shape

```text
ServicesComponent                         list, create, edit, delete
  page /services/create and /services/edit/:type/:name
  wizard dialog via ModalCdsService
ServiceFormComponent                      one form, every type
  service-type-catalog.ts                 menu groups and list labels
  createForm()                            all controls + composeIf
  ngOnInit load                           per-type spec → form
  onSubmit()                              per-type form → spec
Service RESTController                    /api/service
  known_types → ServiceSpec.KNOWN_SERVICE_TYPES
  list, get, daemons
  create → apply(spec, no_overwrite=True), drop service_id when not required
  set    → apply(spec, no_overwrite=False)
  delete → remove(service_name)
```

`known_types` returns strings. There is no `known_types_details`. `ServiceSpec` exposes `KNOWN_SERVICE_TYPES`, `REQUIRES_SERVICE_ID`, `REQUIRES_CERTIFICATES`, and `_cls(service_type)`. It does not expose `KNOWN_TYPES`, `get_class()`, or per-class `REQUIRES_CA_CERT` / `ALLOWS_CUSTOM_SAN` attributes. Certificate rules live on the `REQUIRES_CERTIFICATES` entry.

## 4. Target shape

One shell, one type form, one spec mapper per type. The public routes stay the pages in section 1.1. The shell does not bring back the modal outlet. The wizard keeps embedding the shell and passing `hiddenServices`.

```text
ServiceFormShell
  type            required, disabled on edit
  service id      required only when metadata says so
  unmanaged
  PlacementForm   hosts | label | count
  <type form>     the only fields for this service_type
  CertificateForm rendered from certificate metadata

ServiceTypeForm
  serviceType: string
  buildForm(): FormGroup
  fromSpec(spec): void
  toSpec(raw): object     includes cleared booleans and keys to remove
```

The shell owns the task wrapper and the service name (`type` or `type.id`). It posts `toSpec()`. It does not switch on service type.

Placement-only types use one `GenericServiceForm`. MDS stays on that form. Its id pattern is a validator selected by metadata. The specialized forms are the ones that already have a submit branch: `rgw`, `nvmeof`, `ingress`, `iscsi`, `nfs`, `smb`, `snmp-gateway`, `mgmt-gateway`, `oauth2-proxy`, `grafana`.

```text
service-form/
  service-form-shell.component.ts
  placement-form/
  certificate-form/
  types/
    generic-service-form.ts
    rgw-service-form.ts
    nvmeof-service-form.ts
    ingress-service-form.ts
    iscsi-service-form.ts
    nfs-service-form.ts
    smb-service-form.ts
    snmp-gateway-service-form.ts
    mgmt-gateway-service-form.ts
    oauth2-proxy-service-form.ts
    grafana-service-form.ts
```

The shell emits the same `serviceUpdated` event the wizard already listens for. Page close keeps `Location.back()`.

## 5. Type metadata

`GET /api/service/known_types` stays `List[str]` from `ServiceSpec.KNOWN_SERVICE_TYPES`.

Add `GET /api/service/known_types_details`. Build each object from `REQUIRES_SERVICE_ID` and `REQUIRES_CERTIFICATES`, not from a second copy of those lists in the controller.

```json
[
  {
    "type": "rgw",
    "requires_service_id": true,
    "editable": true,
    "certificates": {
      "user_cert_allowed": true,
      "scope": "service",
      "requires_ca_cert": false
    }
  },
  {
    "type": "nfs",
    "requires_service_id": true,
    "editable": true,
    "certificates": {
      "user_cert_allowed": true,
      "scope": "service",
      "requires_ca_cert": true
    }
  },
  {
    "type": "osd",
    "requires_service_id": false,
    "editable": false
  }
]
```

`editable` is false for `osd` and `container`. Those types stay off the create menu. Promtail stays hidden in the UI because it is deprecated, which is a dashboard rule on top of this list. The id field uses `requires_service_id`. The certificate panel uses the `certificates` object. NFS and SMB are the entries with `requires_ca_cert: true`. NVMe-oF allows a user certificate and does not require a CA.

The controller method matches the existing style:

```python
@Endpoint()
@ReadPermission
def known_types_details(self):
    details = []
    for service_type in ServiceSpec.KNOWN_SERVICE_TYPES:
        certs = ServiceSpec.REQUIRES_CERTIFICATES.get(service_type)
        details.append({
            'type': service_type,
            'requires_service_id': service_type in ServiceSpec.REQUIRES_SERVICE_ID,
            'editable': service_type not in ('osd', 'container'),
            'certificates': certs,
        })
    return details
```

After the shell reads this response, delete `isPrefixedNamedService`, `showExternalSslCert`, and `showExternalSslKey`.

## 6. Edit contract

`toSpec()` returns every field that form owns, including values that mean off.

| User action | Spec field |
| --- | --- |
| mTLS unchecked | `enable_auth: false`, and no `ssl`, `root_ca_cert`, `client_cert`, `client_key`, `server_cert`, `server_key` |
| SSL unchecked | `ssl: false` |
| RGW metrics push unchecked | `metrics_push_enabled: false` |
| QAT compression None | omit `qat` and tell `set` to drop the stored `qat` |
| Certificate source changed to cephadm-signed | `certificate_source: "cephadm-signed"`, omit inline PEM fields |

`fromSpec()` is the only reader of the stored spec. The shell sets `service_id` once from the service name and disables it, which removes the MDS `mds.mds.<id>` path.

`create` stays `apply(..., no_overwrite=True)` and keeps dropping `service_id` when the type is not in `REQUIRES_SERVICE_ID`.

`set` stays `apply(..., no_overwrite=False)` for booleans. For a key cephadm only clears by absence (`qat`, inline PEMs after a switch to a cephadm-signed cert), `toSpec()` lists those keys and `set` removes them from the stored spec before apply. The removal list is dashboard-only. It is popped before the spec is validated or sent to cephadm. Boolean off-values do not need that list.

```python
def set(self, service_spec: Dict, service_name: str):
    keys_to_delete = service_spec.pop('_keys_to_delete', [])
    if keys_to_delete:
        current = OrchClient.instance().services.get(service_name)
        if current:
            merged = current[0].to_json()
            for key in keys_to_delete:
                merged.pop(key, None)
            merged.update(service_spec)
            service_spec = merged
    OrchClient.instance().services.apply(service_spec, no_overwrite=False)
```

RGW still stores its certificate on `rgw_frontend_ssl_certificate` and does not send a key. That mapping lives in `rgw-service-form.ts`. The shared certificate helper keeps the current `applySslCertificateConfig` behavior and takes the field names from the type form.

## 7. What the administrator sees after the split

The page sections from section 1.2 stay. The shell owns Details and Deployment. The mounted type form owns Configuration, so the heading is present only when that type has fields.

```text
Details
  Type *            [ RGW (rgw) v ]     grouped as it is today
  Service id *      rgw.[ foo ]

Deployment
  Placement         ( ) Hosts  ( ) Label  ( ) Count
  Unmanaged         [ ]

Configuration       mounted for this type only
  ...
```

Changing type on create rebuilds the type form. Placement and unmanaged stay. Edit locks Type and Service id. OSD and container stay out of the type list. Their rows on the service table keep Edit disabled, and the disable reason says to use the OSD page or the CLI.

SMB keeps the warning that points at the SMB page. The service form remains the advanced path for the cephadm SMB spec.

Certificate fields render from metadata:

| Source | Fields |
| --- | --- |
| cephadm-signed | optional custom SANs where that type already collects them |
| inline | cert and key when `user_cert_allowed`, CA when `requires_ca_cert` |

## 8. List page follow-up

The columns in section 1.4 stay.

- Uncomment Create's `disable: (selection) => this.getDisable('create', selection)` so a missing `SERVICE_CREATE` feature disables the button with the orchestrator message.
- Keep the `osd` and `container` edit refusal, and return the existing disable description instead of a bare `true`, so the button can show why.
- Set `isMgmtGateway` once, after the rows for the request are loaded, from the full answer rather than from inside the filter callback.
- On delete, reload the table when the task completes and remove `delay(5000)`.

## 9. API

| Action | Request |
| --- | --- |
| Types | `GET /api/service/known_types` returns strings. Unchanged. |
| Type details | `GET /api/service/known_types_details` returns the objects in section 5. Not implemented. |
| List | `GET /api/service` unchanged. The v2 list is paged. |
| Get | `GET /api/service/{name}` unchanged. The shell loads this into `fromSpec()`. |
| Daemons | `GET /api/service/{name}/daemons` unchanged. |
| Create | `POST /api/service` with the object from `toSpec()`, `no_overwrite=True`. |
| Edit | `PUT /api/service/{name}` with the object from `toSpec()`, including explicit `false` for cleared booleans. `set` strips `_keys_to_delete` before `apply`. |
| Delete | `DELETE /api/service/{name}` unchanged. |

## 10. Phases

Each phase leaves create and edit working for every type that already works. The routes, catalog, and list columns from section 1 stay.

1. **List bugs, same form.** Re-enable the Create disable check. Move `isMgmtGateway` out of the filter. Drop the five-second delete delay once reload follows task completion. Format `host_pattern` in `placementText()`. Point the Status column at a value the row actually has.

2. **Shared pieces, same component.** Move placement markup and `applySslCertificateConfig` into child components used by the current form. Add unit tests that a cleared mTLS checkbox and a cleared SSL checkbox produce `enable_auth: false` and `ssl: false`.

3. **Extract the edit-sensitive types.** Pull NVMe-oF, RGW, and ingress into type forms with `fromSpec` and `toSpec`. The shell still hosts the other types.

4. **Extract the rest.** iSCSI, NFS, SMB, SNMP, mgmt-gateway, oauth2-proxy, and Grafana get type forms. Remaining types use `GenericServiceForm`. The shell deletes the `switch` in `onSubmit()` and the per-type patch in `ngOnInit`.

5. **Metadata endpoint.** Serve `requires_service_id`, `editable`, and `certificates` from `ServiceSpec`. Teach `set` to apply `_keys_to_delete`. Point the shell at `known_types_details` and delete the hardcoded TypeScript lists.

## 11. Tests

- One spec per type form: `fromSpec` fills the controls, `toSpec` on create matches today's payload, `toSpec` on edit includes the off value for every checkbox that type owns.
- Shell spec: changing type swaps the child form, edit disables type and id, submit posts `toSpec()` and does not add fields of a different type.
- API spec: `known_types_details` matches `REQUIRES_SERVICE_ID` and `REQUIRES_CERTIFICATES`. `set` of `{ "enable_auth": false }` persists `enable_auth: false`. `set` with `_keys_to_delete: ["qat"]` removes `qat` before apply.
- List spec: Create is disabled when `SERVICE_CREATE` is absent. `isMgmtGateway` does not change while a filter runs.

## 12. Out of scope

- OSD creation stays on the OSD page. Container services stay out of this form.
- SMB share, user, and join-auth CRUD stays on the SMB pages.
- Replacing cephadm merge semantics for every spec field. This design makes the dashboard send a complete spec for the fields it shows, and removes keys that cephadm treats as present-by-existence.
