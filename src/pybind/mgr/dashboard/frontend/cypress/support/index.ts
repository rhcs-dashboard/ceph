import '@applitools/eyes-cypress/commands';

import './commands';

afterEach(() => {
  cy.visit('#/403');
  // this can be removed once error for No RGW daemons found is fixed
  Cypress.on('uncaught:exception', (_err, _runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    return false;
  });
});
