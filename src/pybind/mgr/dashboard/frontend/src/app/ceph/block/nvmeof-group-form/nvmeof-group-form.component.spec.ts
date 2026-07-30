import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';

import { NgbActiveModal, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

import { PaginateObservable } from '~/app/shared/api/paginate.model';
import { CdFormGroup } from '~/app/shared/forms/cd-form-group';
import { SharedModule } from '~/app/shared/shared.module';
import { CertificateType } from '~/app/shared/models/service.interface';

import { NvmeofGroupFormComponent } from './nvmeof-group-form.component';
import { CheckboxModule, GridModule, InputModule, SelectModule } from 'carbon-components-angular';
import { PoolService } from '~/app/shared/api/pool.service';
import { TaskWrapperService } from '~/app/shared/services/task-wrapper.service';
import { CephServiceService } from '~/app/shared/api/ceph-service.service';
import { NvmeofService } from '~/app/shared/api/nvmeof.service';
import { FormHelper } from '~/testing/unit-test-helper';

describe('NvmeofGroupFormComponent', () => {
  let component: NvmeofGroupFormComponent;
  let fixture: ComponentFixture<NvmeofGroupFormComponent>;
  let form: CdFormGroup;
  let formHelper: FormHelper;
  let poolService: PoolService;
  let taskWrapperService: TaskWrapperService;
  let cephServiceService: CephServiceService;
  let nvmeofService: NvmeofService;
  let router: Router;

  const mockPools = [
    { pool_name: 'rbd', application_metadata: ['rbd'] },
    { pool_name: 'rbd', application_metadata: ['rbd'] },
    { pool_name: 'pool2', application_metadata: ['rgw'] }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NvmeofGroupFormComponent],
      providers: [
        NgbActiveModal,
        {
          provide: ActivatedRoute,
          useValue: { params: of({}) }
        }
      ],
      imports: [
        HttpClientTestingModule,
        NgbTypeaheadModule,
        ReactiveFormsModule,
        RouterTestingModule,
        SharedModule,
        CheckboxModule,
        GridModule,
        InputModule,
        SelectModule,
        ToastrModule.forRoot()
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NvmeofGroupFormComponent);
    component = fixture.componentInstance;
    poolService = TestBed.inject(PoolService);
    taskWrapperService = TestBed.inject(TaskWrapperService);
    cephServiceService = TestBed.inject(CephServiceService);
    nvmeofService = TestBed.inject(NvmeofService);
    router = TestBed.inject(Router);

    spyOn(poolService, 'list').and.returnValue(Promise.resolve(mockPools));
    spyOn(nvmeofService, 'exists').and.returnValue(of(false));

    component.ngOnInit();
    fixture.detectChanges();
    form = component.groupForm;
    formHelper = new FormHelper(form);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty fields', () => {
    expect(form.controls.groupName.value).toBeNull();
    expect(form.controls.unmanaged.value).toBe(false);
  });

  it('should set action to CREATE on init', () => {
    expect(component.action).toBe('Create');
  });

  it('should set resource to gateway group', () => {
    expect(component.resource).toBe('gateway group');
  });

  describe('form validation', () => {
    it('should require groupName', () => {
      formHelper.setValue('groupName', '');
      formHelper.expectError('groupName', 'required');
    });

    it('should require pool', () => {
      formHelper.setValue('pool', null);
      formHelper.expectError('pool', 'required');
    });

    it('should be valid when groupName and pool are set', () => {
      formHelper.setValue('groupName', 'test-group');
      formHelper.setValue('pool', 'rbd');
      expect(form.valid).toBe(true);
    });

    it('should require external cert fields when mTLS and external certificate type are selected', () => {
      form.controls.enableMtls.setValue(true);
      form.controls.certificateType.setValue(CertificateType.external);

      ['rootCACert', 'clientCert', 'clientKey', 'serverCert', 'serverKey'].forEach((name) => {
        form.controls[name].setValue('');
        form.controls[name].markAsTouched();
        form.controls[name].updateValueAndValidity();
        expect(form.controls[name].hasError('required')).toBe(true);
      });
    });

    it('should not require external cert fields when mTLS is disabled', () => {
      formHelper.setValue('enableMtls', false);
      formHelper.setValue('certificateType', CertificateType.external);

      ['rootCACert', 'clientCert', 'clientKey', 'serverCert', 'serverKey'].forEach((name) => {
        expect(form.controls[name].hasError('required')).toBe(false);
      });
    });

    it('should not require external cert fields when mTLS uses internal certificates', () => {
      formHelper.setValue('enableMtls', true);
      formHelper.setValue('certificateType', CertificateType.internal);

      ['rootCACert', 'clientCert', 'clientKey', 'serverCert', 'serverKey'].forEach((name) => {
        expect(form.controls[name].hasError('required')).toBe(false);
      });
    });
  });

  describe('loadPools', () => {
    it('should load pools and filter by rbd application metadata', fakeAsync(() => {
      component.loadPools();
      tick();
      expect(component.pools.length).toBe(2);
      expect(component.pools.map((p) => p.pool_name)).toEqual(['rbd', 'rbd']);
    }));

    it('should set default pool to rbd if available', fakeAsync(() => {
      component.groupForm.get('pool').setValue(null);
      component.loadPools();
      tick();
      expect(component.groupForm.get('pool').value).toBe('rbd');
    }));

    it('should set first pool if rbd is not available', fakeAsync(() => {
      component.groupForm.get('pool').setValue(null);
      const poolsWithoutRbd = [{ pool_name: 'custom-pool', application_metadata: ['rbd'] }];
      (poolService.list as jasmine.Spy).and.returnValue(Promise.resolve(poolsWithoutRbd));
      component.loadPools();
      tick();
      expect(component.groupForm.get('pool').value).toBe('custom-pool');
    }));

    it('should handle empty pools', fakeAsync(() => {
      (poolService.list as jasmine.Spy).and.returnValue(Promise.resolve([]));
      component.loadPools();
      tick();
      expect(component.pools.length).toBe(0);
      expect(component.poolsLoading).toBe(false);
    }));

    it('should handle pool loading error', fakeAsync(() => {
      (poolService.list as jasmine.Spy).and.returnValue(Promise.reject('error'));
      component.loadPools();
      tick();
      expect(component.pools).toEqual([]);
      expect(component.poolsLoading).toBe(false);
    }));
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      spyOn(cephServiceService, 'create').and.returnValue(of({}));
      spyOn(taskWrapperService, 'wrapTaskAroundCall').and.callFake(({ call }) => call);
      spyOn(router, 'navigateByUrl');
    });

    it('should not call create if no hosts are selected', () => {
      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [],
        getSelectedHostnames: (): string[] => []
      } as any;

      component.groupForm.get('groupName').setValue('test-group');
      component.groupForm.get('pool').setValue('rbd');
      component.onSubmit();

      expect(cephServiceService.create).not.toHaveBeenCalled();
    });

    it('should create service with correct spec', () => {
      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'host1' }, { hostname: 'host2' }],
        getSelectedHostnames: (): string[] => ['host1', 'host2']
      } as any;

      component.groupForm.get('groupName').setValue('defalut');
      component.groupForm.get('pool').setValue('rbd');
      component.groupForm.get('unmanaged').setValue(false);
      component.onSubmit();

      expect(cephServiceService.create).toHaveBeenCalledWith({
        service_type: 'nvmeof',
        service_id: 'rbd.defalut',
        pool: 'rbd',
        group: 'defalut',
        placement: {
          hosts: ['host1', 'host2']
        },
        unmanaged: false
      });
    });

    it('should create service with unmanaged flag set to true', () => {
      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'host1' }],
        getSelectedHostnames: (): string[] => ['host1']
      } as any;

      component.groupForm.get('groupName').setValue('unmanaged-group');
      component.groupForm.get('pool').setValue('rbd');
      component.groupForm.get('unmanaged').setValue(true);
      component.onSubmit();

      expect(cephServiceService.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          unmanaged: true,
          group: 'unmanaged-group',
          pool: 'rbd'
        })
      );
    });

    it('should create service with encryption key when enabled', () => {
      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'host1' }],
        getSelectedHostnames: (): string[] => ['host1']
      } as any;

      component.groupForm.get('groupName').setValue('encrypted-group');
      component.groupForm.get('enableEncryption').setValue(true);
      component.groupForm.get('encryptionKey').setValue('encryption-key-123');
      component.onSubmit();

      expect(cephServiceService.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          group: 'encrypted-group',
          encryption_key: 'encryption-key-123'
        })
      );
    });

    it('should create service with cephadm-signed mTLS when internal selected', () => {
      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'host1' }],
        getSelectedHostnames: (): string[] => ['host1']
      } as any;

      component.groupForm.get('groupName').setValue('mtls-internal');
      component.groupForm.get('enableEncryption').setValue(true);
      component.groupForm.get('encryptionKey').setValue('test-encryption-key');
      component.groupForm.get('enableMtls').setValue(true);
      component.groupForm.get('certificateType').setValue(component.CertificateType.internal);
      component.groupForm.get('custom_sans').setValue(['gw1.local', '192.168.0.10']);

      component.onSubmit();

      expect(cephServiceService.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          service_type: 'nvmeof',
          service_id: 'rbd.mtls-internal',
          ssl: true,
          enable_auth: true,
          certificate_source: 'cephadm-signed',
          custom_sans: ['gw1.local', '192.168.0.10']
        })
      );
    });

    it('should create service with inline mTLS when external selected', () => {
      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'host1' }],
        getSelectedHostnames: (): string[] => ['host1']
      } as any;

      component.groupForm.get('groupName').setValue('mtls-external');
      component.groupForm.get('enableEncryption').setValue(true);
      component.groupForm.get('encryptionKey').setValue('test-encryption-key');
      component.groupForm.get('enableMtls').setValue(true);
      component.groupForm.get('certificateType').setValue(component.CertificateType.external);
      component.groupForm.get('rootCACert').setValue('root');
      component.groupForm.get('clientCert').setValue('client-cert');
      component.groupForm.get('clientKey').setValue('client-key');
      component.groupForm.get('serverCert').setValue('server-cert');
      component.groupForm.get('serverKey').setValue('server-key');

      component.onSubmit();

      expect(cephServiceService.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          service_id: 'rbd.mtls-external',
          ssl: true,
          enable_auth: true,
          certificate_source: 'inline',
          root_ca_cert: 'root',
          client_cert: 'client-cert',
          client_key: 'client-key',
          server_cert: 'server-cert',
          server_key: 'server-key'
        })
      );
    });

    it('should navigate to list view on success', () => {
      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'host1' }],
        getSelectedHostnames: (): string[] => ['host1']
      } as any;

      component.groupForm.get('groupName').setValue('test-group');
      component.groupForm.get('pool').setValue('rbd');
      component.onSubmit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/block/nvmeof/gateways');
    });
  });

  describe('edit mode', () => {
    const mockCertificate = {
      cert_name: 'nvmeof.Test1',
      scope: 'service',
      requires_certificate: true,
      status: 'valid',
      days_to_expiration: 90,
      signed_by: 'cephadm',
      has_certificate: true,
      certificate_source: 'cephadm-signed',
      expiry_date: '2026-12-01T00:00:00Z',
      issuer: 'Cephadm',
      common_name: 'nvmeof.Test1'
    };

    const mockService = {
      service_name: 'nvmeof.Test1',
      service_type: 'nvmeof',
      service_id: 'Test1',
      unmanaged: false,
      certificate: mockCertificate,
      placement: { hosts: ['ceph-node-01', 'ceph-node-02'] },
      spec: {
        group: 'Test1',
        pool: 'rbd',
        encryption_key: 'existing-encryption-key',
        enable_auth: true,
        ssl: true,
        certificate_source: 'cephadm-signed',
        custom_sans: ['gw1.local']
      }
    };

    beforeEach(() => {
      spyOn(nvmeofService, 'listGatewayGroups').and.returnValue(of([[mockService]]));
      spyOn(cephServiceService, 'list').and.returnValue(
        new PaginateObservable<any>(of([mockService]))
      );

      component.editing = true;
      component.gatewayGroupName = 'Test1';
      component.action = 'Edit';
      component.createForm();
      component.loadGatewayGroupData('Test1');
      form = component.groupForm;
    });

    it('should resolve group by spec.group and preselect hosts', () => {
      expect(nvmeofService.listGatewayGroups).toHaveBeenCalled();
      expect(cephServiceService.list).toHaveBeenCalled();
      expect(component.preSelectedHostnames).toEqual(['ceph-node-01', 'ceph-node-02']);
      expect(form.controls.groupName.value).toBe('Test1');
    });

    it('should prepopulate encryption checkbox and key when encryption_key is present', () => {
      expect(form.controls.enableEncryption.value).toBe(true);
      expect(form.controls.encryptionKey.value).toBe('existing-encryption-key');
    });

    it('should prepopulate mTLS from enable_auth and load current certificate', () => {
      expect(form.controls.enableMtls.value).toBe(true);
      expect(form.controls.certificateType.value).toBe(CertificateType.internal);
      expect(form.controls.custom_sans.value).toEqual(['gw1.local']);
      expect(component.currentCertificate).toEqual(mockCertificate);
      expect(component.currentSpecCertificateSource).toBe('cephadm-signed');
    });

    it('should prepopulate external cert fields when certificate_source is inline', () => {
      const inlineService = {
        ...mockService,
        certificate: {
          ...mockCertificate,
          signed_by: 'external',
          certificate_source: 'inline'
        },
        spec: {
          ...mockService.spec,
          certificate_source: 'inline',
          root_ca_cert: 'root-pem',
          client_cert: 'client-pem',
          client_key: 'client-key-pem',
          server_cert: 'server-pem',
          server_key: 'server-key-pem'
        }
      };
      (nvmeofService.listGatewayGroups as jasmine.Spy).and.returnValue(of([[inlineService]]));
      (cephServiceService.list as jasmine.Spy).and.returnValue(
        new PaginateObservable<any>(of([inlineService]))
      );

      component.createForm();
      component.loadGatewayGroupData('Test1');

      expect(component.groupForm.controls.certificateType.value).toBe(CertificateType.external);
      expect(component.groupForm.controls.rootCACert.value).toBe('root-pem');
      expect(component.groupForm.controls.clientCert.value).toBe('client-pem');
      expect(component.groupForm.controls.clientKey.value).toBe('client-key-pem');
      expect(component.groupForm.controls.serverCert.value).toBe('server-pem');
      expect(component.groupForm.controls.serverKey.value).toBe('server-key-pem');
    });

    it('should require empty external cert fields after loading an inline mTLS group', () => {
      const inlineService = {
        ...mockService,
        spec: {
          ...mockService.spec,
          certificate_source: 'inline',
          root_ca_cert: null,
          client_cert: null,
          client_key: null,
          server_cert: null,
          server_key: null
        }
      };
      (nvmeofService.listGatewayGroups as jasmine.Spy).and.returnValue(of([[inlineService]]));
      (cephServiceService.list as jasmine.Spy).and.returnValue(
        new PaginateObservable<any>(of([inlineService]))
      );

      component.createForm();
      component.loadGatewayGroupData('Test1');

      ['rootCACert', 'clientCert', 'clientKey', 'serverCert', 'serverKey'].forEach((name) => {
        expect(component.groupForm.controls[name].hasError('required')).toBe(true);
      });
    });

    it('should show cert source change warning when switching type on edit', () => {
      component.onCertificateTypeChange(CertificateType.external);
      expect(component.showCertSourceChangeWarning).toBe(true);

      component.onCertificateTypeChange(CertificateType.internal);
      expect(component.showCertSourceChangeWarning).toBe(false);
    });

    it('should make encryptionKey required when encryption is enabled', () => {
      form.controls.enableEncryption.setValue(true);
      form.controls.encryptionKey.setValue('');
      form.controls.encryptionKey.markAsTouched();
      form.controls.encryptionKey.updateValueAndValidity();

      expect(form.controls.encryptionKey.hasError('required')).toBe(true);
    });

    it('should clear encryptionKey validator and value when encryption is disabled', () => {
      form.controls.enableEncryption.setValue(true);
      form.controls.encryptionKey.setValue('some-key');

      form.controls.enableEncryption.setValue(false);
      expect(form.controls.encryptionKey.value).toBeNull();
      expect(form.controls.encryptionKey.hasError('required')).toBe(false);
      expect(form.valid).toBe(true);
    });

    it('should NOT set enableEncryption when ssl:true but encryption_key is absent (cephadm-internal ssl)', () => {
      const sslOnlyService = {
        ...mockService,
        spec: {
          ...mockService.spec,
          ssl: true,
          encryption_key: null,
          enable_auth: false
        }
      };
      (nvmeofService.listGatewayGroups as jasmine.Spy).and.returnValue(of([[sslOnlyService]]));
      (cephServiceService.list as jasmine.Spy).and.returnValue(
        new PaginateObservable<any>(of([sslOnlyService]))
      );

      component.createForm();
      component.loadGatewayGroupData('Test1');

      expect(component.groupForm.controls.enableEncryption.value).toBe(false);
      expect(component.groupForm.controls.enableMtls.value).toBe(false);
    });

    it('should NOT pre-check checkboxes for a plain group (no encryption, no mTLS)', () => {
      const plainService = {
        service_name: 'nvmeof.Plain',
        service_type: 'nvmeof',
        service_id: 'Plain',
        unmanaged: false,
        placement: { hosts: ['ceph-node-01'] },
        spec: {
          group: 'Plain',
          ssl: false,
          enable_auth: false,
          encryption_key: null
        }
      };
      const cephadmEnrichedService = {
        ...plainService,
        spec: { ...plainService.spec, ssl: true, enable_auth: true }
      };
      (nvmeofService.listGatewayGroups as jasmine.Spy).and.returnValue(of([[plainService]]));
      (cephServiceService.list as jasmine.Spy).and.returnValue(
        new PaginateObservable<any>(of([cephadmEnrichedService]))
      );

      component.editing = true;
      component.gatewayGroupName = 'Plain';
      component.createForm();
      component.loadGatewayGroupData('Plain');

      expect(component.groupForm.controls.enableEncryption.value).toBe(false);
      expect(component.groupForm.controls.enableMtls.value).toBe(false);
    });

    it('should update service on submit in edit mode using existing service_id', () => {
      spyOn(cephServiceService, 'update').and.returnValue(of({}));
      spyOn(taskWrapperService, 'wrapTaskAroundCall');
      spyOn(router, 'navigateByUrl');

      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'ceph-node-01' }],
        getSelectedHostnames: (): string[] => ['ceph-node-01']
      } as any;

      component.onSubmit();

      expect(taskWrapperService.wrapTaskAroundCall).not.toHaveBeenCalled();
      expect(cephServiceService.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          service_type: 'nvmeof',
          service_id: 'Test1',
          group: 'Test1',
          pool: 'rbd',
          placement: { hosts: ['ceph-node-01'] },
          encryption_key: 'existing-encryption-key',
          ssl: true,
          enable_auth: true,
          certificate_source: 'cephadm-signed'
        })
      );
      expect(router.navigateByUrl).toHaveBeenCalledWith('/block/nvmeof/gateways');
    });

    it('should preserve existing pool in edit update payload', () => {
      spyOn(cephServiceService, 'update').and.returnValue(of({}));
      spyOn(router, 'navigateByUrl');

      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'ceph-node-01' }],
        getSelectedHostnames: (): string[] => ['ceph-node-01']
      } as any;

      component.onSubmit();

      expect(cephServiceService.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          pool: 'rbd'
        })
      );
    });

    it('should send encryption_key: null when encryption is unchecked on edit', () => {
      spyOn(cephServiceService, 'update').and.returnValue(of({}));
      spyOn(router, 'navigateByUrl');

      component.gatewayNodeComponent = {
        getSelectedHosts: (): any[] => [{ hostname: 'ceph-node-01' }],
        getSelectedHostnames: (): string[] => ['ceph-node-01']
      } as any;

      form.controls.enableEncryption.setValue(false);

      component.onSubmit();

      expect(cephServiceService.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          encryption_key: null
        })
      );
      expect(router.navigateByUrl).toHaveBeenCalledWith('/block/nvmeof/gateways');
    });
  });
});
