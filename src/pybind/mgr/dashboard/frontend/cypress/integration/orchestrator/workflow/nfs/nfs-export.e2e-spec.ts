import { ServicesPageHelper } from 'cypress/integration/cluster/services.po';
import { BucketsPageHelper } from 'cypress/integration/rgw/buckets.po';

import { NFSPageHelper } from './nfs-export.po';

describe('nfsExport page', () => {
  const nfsExport = new NFSPageHelper();
  const services = new ServicesPageHelper();
  const buckets = new BucketsPageHelper();
  const bucket_name = 'e2ebucket';
  const fsPseudo = '/fspseudo';
  const rgwPseudo = '/rgwpseudo';
  const editpseudo = '/editpseudo';
  const backends = ['CephFS', 'Object Gateway'];
  const squash = 'no_root_squash';
  const client: object = { addresses: '192.168.0.10' };

  beforeEach(() => {
    cy.login();
    Cypress.Cookies.preserveOnce('token');
    nfsExport.navigateTo();
  });

  describe('breadcrumb test', () => {
    it('should open and show breadcrumb', () => {
      nfsExport.expectBreadcrumbText('NFS');
    });
  });

  describe('Create, edit and delete', () => {
    it('should create an NFS cluster', () => {
      services.navigateTo('create');

      services.addService('nfs');

      services.checkExist('nfs.testnfs', true);
      services.getExpandCollapseElement().click();
      services.checkServiceStatus('nfs');
    });

    it('should create a nfs-export with CephFS backend', () => {
      nfsExport.navigateTo();
      nfsExport.existTableCell(fsPseudo, false);
      nfsExport.navigateTo('create');
      nfsExport.create(backends[0], squash, client, fsPseudo);
      nfsExport.existTableCell(fsPseudo);
    });

    it('should show Clients', () => {
      nfsExport.clickTab('cd-nfs-details', fsPseudo, 'Clients (1)');
      cy.get('cd-nfs-details').within(() => {
        nfsExport.getTableCount('total').should('be.gte', 0);
      });
    });

    it('should edit an export', () => {
      nfsExport.editExport(fsPseudo, editpseudo);

      nfsExport.existTableCell(editpseudo);
    });

    it('should create a nfs-export with RGW backend', () => {
      services.navigateTo('create');

      services.addService('rgw');

      services.checkExist('rgw.foo', true);
      services.getExpandCollapseElement().click();
      services.checkServiceStatus('rgw');

      buckets.navigateTo('create');
      buckets.create(bucket_name, 'dashboard', 'default-placement');

      nfsExport.navigateTo();
      nfsExport.existTableCell(rgwPseudo, false);
      nfsExport.navigateTo('create');
      nfsExport.create(backends[1], squash, client, rgwPseudo, bucket_name);
      nfsExport.existTableCell(rgwPseudo);
    });

    it('should delete exports, bucket and services', () => {
      nfsExport.delete(editpseudo);
      nfsExport.delete(rgwPseudo);

      buckets.navigateTo();
      buckets.delete(bucket_name);

      services.navigateTo();
      services.deleteService('rgw.foo');
      services.deleteService('nfs.testnfs');
    });
  });
});
