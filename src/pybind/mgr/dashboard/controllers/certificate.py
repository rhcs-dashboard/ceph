from typing import Any, Dict, List, Literal, Optional, get_args

import cherrypy
from ceph.deployment.service_spec import ServiceSpec

from ..exceptions import DashboardException
from ..security import Scope
from ..services.certificate import CertificateService, CertificateStatus
from ..services.exception import handle_orchestrator_error
from ..services.orchestrator import OrchClient, OrchFeature
from ..tools import str_to_bool
from . import APIDoc, APIRouter, EndpointDoc, ReadPermission, RESTController
from .orchestrator import raise_if_no_orchestrator

# Valid types for certificate status and scope filters
CertificateStatusType = Literal[
    CertificateStatus.EXPIRED,
    CertificateStatus.EXPIRING,
    CertificateStatus.VALID,
    CertificateStatus.INVALID
]
CertificateScopeType = Literal['service', 'host', 'global']


CERTIFICATE_LIST_SCHEMA = [{
    'cert_name': (str, 'Certificate name'),
    'scope': (str, 'Certificate scope (SERVICE, HOST, or GLOBAL)'),
    'signed_by': (str, 'Certificate issuer (user or cephadm)'),
    'status': (str, 'Certificate status (valid, expiring, expired, invalid)'),
    'days_to_expiration': (int, 'Days remaining until expiration'),
    'expiry_date': (str, 'Certificate expiration date'),
    'issuer': (str, 'Certificate issuer distinguished name'),
    'common_name': (str, 'Certificate common name (CN)'),
    'target': (str, 'Certificate target (service name or hostname)'),
    'subject': (dict, 'Certificate subject details'),
    'key_type': (str, 'Public key type (RSA, ECC, etc.)'),
    'key_size': (int, 'Public key size in bits')
}]


@APIRouter('/certificate', Scope.HOSTS)
@APIDoc("Certificate Management API", "Certificate")
class Certificate(RESTController):

    @EndpointDoc("List All Certificates",
                 parameters={
                     'status': (str, 'Filter by certificate status '
                                     '(e.g., "expired", "expiring", "valid", "invalid")'),
                     'scope': (str, 'Filter by certificate scope '
                                    '(e.g., "SERVICE", "HOST", "GLOBAL")'),
                     'service_name': (str, 'Filter by certificate name '
                                      '(e.g., "rgw*")'),
                     'include_cephadm_signed': (bool, 'Include cephadm-signed certificates '
                                                'in the list (default: False)')
                 },
                 responses={200: CERTIFICATE_LIST_SCHEMA})
    @raise_if_no_orchestrator([OrchFeature.SERVICE_LIST])
    @ReadPermission
    @handle_orchestrator_error('certificate')
    def list(self, status: Optional[str] = None, scope: Optional[str] = None,
             service_name: Optional[str] = None,
             include_cephadm_signed: bool = False) -> List[Dict]:
        """
        List all certificates configured in the cluster.

        This endpoint returns a list of all certificates managed by certmgr,
        including both user-provided and cephadm-signed certificates.

        :param status: Filter by certificate status. Valid values: 'expired',
            'expiring', 'valid', 'invalid'
        :param scope: Filter by certificate scope. Valid values: 'SERVICE',
            'HOST', 'GLOBAL'
        :param service_name: Filter by certificate name. Supports wildcards
            (e.g., 'rgw*')
        :param include_cephadm_signed: If True, include cephadm-signed certificates.
            If False (default), only user-provided certificates are returned.
        :return: List of certificate objects with their details
        """
        orch = OrchClient.instance()

        # Validate status parameter
        valid_statuses = get_args(CertificateStatusType)
        if status and status.lower() not in valid_statuses:
            valid_vals = ", ".join(valid_statuses)
            raise DashboardException(f'Invalid status: {status}. Valid values are: {valid_vals}')

        # Validate scope parameter
        valid_scopes = get_args(CertificateScopeType)
        if scope and scope.lower() not in valid_scopes:
            valid_vals = ", ".join(valid_scopes)
            raise DashboardException(f'Invalid scope: {scope}. Valid values are: {valid_vals}')

        include_cephadm_signed = str_to_bool(include_cephadm_signed)

        # Build filter_by string from separate parameters
        filter_parts = []
        if status:
            filter_parts.append(f'status={status.lower()}')
        if scope:
            filter_parts.append(f'scope={scope.lower()}')
        if service_name:
            filter_parts.append(f'name=*{service_name.lower()}*')

        filter_by = ','.join(filter_parts)

        try:
            cert_ls_data = CertificateService.fetch_all_certificates(
                orch, filter_by=filter_by or '', show_details=False,
                include_cephadm_signed=include_cephadm_signed, raise_on_error=True
            )
        except RuntimeError as e:
            raise DashboardException(
                msg=f'Failed to retrieve certificate list: {str(e)}',
                http_status_code=500,
                component='certificate'
            )

        # Transform certificate data into a list format
        # Note: Filtering is already done by cert_ls via filter_by parameter
        certificates_list = CertificateService.process_certificates_for_list(cert_ls_data)

        cherrypy.response.headers['X-Total-Count'] = str(len(certificates_list))

        return certificates_list

    @raise_if_no_orchestrator([OrchFeature.SERVICE_LIST, OrchFeature.DAEMON_LIST])
    @ReadPermission
    @handle_orchestrator_error('certificate')
    def get(self, service_name: str) -> Dict[str, Any]:
        """
        Get detailed certificate information for a service.

        :param service_name: The service name, e.g. 'rgw.myzone'.
        :return: Detailed certificate information including full certificate details
        """
        orch = OrchClient.instance()

        # Get service information
        services = orch.services.get(service_name)
        if not services:
            raise DashboardException(
                msg=f'Service {service_name} not found',
                http_status_code=404,
                component='certificate'
            )

        service = services[0]
        service_type = service.service_type()
        service_name_full = service.spec.service_name()

        cert_config = ServiceSpec.REQUIRES_CERTIFICATES.get(service_type)
        if not cert_config:
            raise DashboardException(
                msg=f'Service {service_name} does not require certificates',
                http_status_code=400,
                component='certificate'
            )

        user_cert_name = f"{service_type.replace('-', '_')}_ssl_cert"
        cephadm_cert_name = f"cephadm-signed_{service_type}_cert"
        cert_scope_str = cert_config.get('scope', 'service').upper()

        cert_ls_data = CertificateService.fetch_certificates_for_service(
            orch, service_type, user_cert_name, cephadm_cert_name
        )

        # Get daemon hostnames for HOST scope certificates
        daemon_hostnames, _ = CertificateService.get_daemon_hostnames(orch, service_name_full)

        # Find the certificate - try user-provided first, then cephadm-signed
        cert_details, target_key, cert_name, cert_scope_str = \
            CertificateService.find_certificate_for_service(
                cert_ls_data, service_type, service_name_full, cert_scope_str, daemon_hostnames
            )

        return CertificateService.build_certificate_status_response(
            cert_details, cert_name or user_cert_name, cert_scope_str, target_key,
            include_target=True, include_details=True
        )

    @EndpointDoc("Get Root CA Certificate",
                 responses={
                     200: {
                         'certificate': (str, 'Root CA certificate in PEM format')
                     }
                 })
    @RESTController.Collection('GET', path='/root-ca')
    @raise_if_no_orchestrator([OrchFeature.SERVICE_LIST])
    @ReadPermission
    @handle_orchestrator_error('certificate')
    def root_ca(self) -> Dict[str, str]:
        """
        Get the cephadm root CA certificate.

        This endpoint returns the root Certificate Authority (CA) certificate
        used by cephadm to sign other certificates in the cluster.

        :return: Dictionary with certificate field containing root CA certificate in PEM format
        """
        orch = OrchClient.instance()

        # Root CA certificate name
        root_ca_cert_name = 'cephadm_root_ca_cert'

        # Get the root CA certificate
        # Root CA is GLOBAL scope, so no service_name or hostname needed
        try:
            if not hasattr(orch.cert_store, 'get_cert'):
                raise DashboardException(
                    msg='Certificate store get_cert method not available',
                    http_status_code=500,
                    component='certificate'
                )
            root_ca_cert = orch.cert_store.get_cert(
                root_ca_cert_name,
                service_name=None,
                hostname=None,
                ignore_missing_exception=False
            )
        except DashboardException:
            raise
        except Exception as e:
            raise DashboardException(
                msg=f'Failed to retrieve root CA certificate: {str(e)}',
                http_status_code=500,
                component='certificate'
            )

        if not root_ca_cert:
            raise DashboardException(
                msg='Root CA certificate not found',
                http_status_code=404,
                component='certificate'
            )

        return {'certificate': root_ca_cert}
