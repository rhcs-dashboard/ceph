import { NFSPageHelper } from './nfs-export.po';

describe('nfsExport page', () => {
  const nfsExport = new NFSPageHelper();
  const path = '/';
  const pseudo = '/testpseudo';
  const editpseudo = '/editpseudo';
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
    it('should create a nfs-export', () => {
      nfsExport.existTableCell(path, false);
      nfsExport.navigateTo('create');
      nfsExport.create(pseudo, squash, client);
      nfsExport.existTableCell(path);
    });

    it('should show Clients', () => {
      nfsExport.clickTab('cd-nfs-details', path, 'Clients (1)');
      cy.get('cd-nfs-details').within(() => {
        nfsExport.getTableCount('total').should('be.gte', 0);
      });
    });

    it('should edit an export', () => {
      nfsExport.editExport(path, editpseudo);

      nfsExport.existTableCell(path);
    });

    it('should delete an export', () => {
      nfsExport.delete(path);
    });
  });
});
