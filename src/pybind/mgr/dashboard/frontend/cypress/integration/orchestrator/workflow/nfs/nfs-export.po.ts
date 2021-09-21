import { PageHelper } from 'cypress/integration/page-helper.po';

const pages = {
  index: { url: '#/nfs', id: 'cd-nfs-list' },
  create: { url: '#/nfs/create', id: 'cd-nfs-form' }
};

export class NFSPageHelper extends PageHelper {
  pages = pages;

  @PageHelper.restrictTo(pages.create.url)
  create(pseudo: string, squash: string, client: object) {
    this.selectOption('cluster_id', 'mynfs');
    // test with CEPHFS backend
    this.selectOption('name', 'CephFS');
    this.selectOption('fs_name', 'myfs');

    cy.get('#security_label').click({ force: true });
    cy.get('input[name=pseudo]').type(pseudo);
    this.selectOption('squash', squash);

    // Add clients
    cy.get('button[name=add_client]').click({ force: true });
    cy.get('input[name=addresses]').type(client['addresses']);

    cy.get('cd-submit-button').click();
  }

  editExport(path: string, pseudo: string) {
    this.navigateEdit(path);

    cy.get('input[name=pseudo]').clear().type(pseudo);

    cy.get('cd-submit-button').click();

    // Click the export and check its details table for updated content
    this.getExpandCollapseElement(path).click();
    cy.get('.active.tab-pane').should('contain.text', pseudo);
  }
}
