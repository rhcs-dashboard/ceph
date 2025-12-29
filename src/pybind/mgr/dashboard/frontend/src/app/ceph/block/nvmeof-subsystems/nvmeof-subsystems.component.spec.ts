import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '~/app/shared/shared.module';

import { NvmeofService } from '../../../shared/api/nvmeof.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { ModalService } from '~/app/shared/services/modal.service';
import { TaskWrapperService } from '~/app/shared/services/task-wrapper.service';
import { NvmeofSubsystemsComponent } from './nvmeof-subsystems.component';
import { NvmeofSubsystemsDetailsComponent } from '../nvmeof-subsystems-details/nvmeof-subsystems-details.component';
import { ComboBoxModule, GridModule } from 'carbon-components-angular';

const mockSubsystems = [
  {
    nqn: 'nqn.2001-07.com.ceph:1720603703820',
    enable_ha: true,
    serial_number: 'Ceph30487186726692',
    model_number: 'Ceph bdev Controller',
    min_cntlid: 1,
    max_cntlid: 2040,
    namespace_count: 0,
    subtype: 'NVMe',
    max_namespaces: 256
  }
];

const mockInitiators = [
  { nqn: 'nqn.2014-08.org.nvmexpress:uuid:host1' },
  { nqn: 'nqn.2014-08.org.nvmexpress:uuid:host2' }
];

const mockGroups = [
  [
    {
      service_name: 'nvmeof.rbd.default',
      service_type: 'nvmeof',
      unmanaged: false,
      spec: {
        group: 'default'
      }
    },
    {
      service_name: 'nvmeof.rbd.foo',
      service_type: 'nvmeof',
      unmanaged: false,
      spec: {
        group: 'foo'
      }
    }
  ],
  2
];

const expectedSubsystems = [
  {
    nqn: 'nqn.2001-07.com.ceph:1720603703820',
    enable_ha: true,
    serial_number: 'Ceph30487186726692',
    model_number: 'Ceph bdev Controller',
    min_cntlid: 1,
    max_cntlid: 2040,
    namespace_count: 0,
    subtype: 'NVMe',
    max_namespaces: 256,
    gw_group: 'default',
    initiator_count: 2
  },
  {
    nqn: 'nqn.2001-07.com.ceph:1720603703820',
    enable_ha: true,
    serial_number: 'Ceph30487186726692',
    model_number: 'Ceph bdev Controller',
    min_cntlid: 1,
    max_cntlid: 2040,
    namespace_count: 0,
    subtype: 'NVMe',
    max_namespaces: 256,
    gw_group: 'foo',
    initiator_count: 2
  }
];

class MockNvmeOfService {
  listSubsystems() {
    return of(mockSubsystems);
  }

  listGatewayGroups() {
    return of(mockGroups);
  }

  getInitiators() {
    return of(mockInitiators);
  }
}

class MockAuthStorageService {
  getPermissions() {
    return { nvmeof: {} };
  }
}

class MockModalService {}

class MockTaskWrapperService {}

describe('NvmeofSubsystemsComponent', () => {
  let component: NvmeofSubsystemsComponent;
  let fixture: ComponentFixture<NvmeofSubsystemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NvmeofSubsystemsComponent, NvmeofSubsystemsDetailsComponent],
      imports: [HttpClientModule, RouterTestingModule, SharedModule, ComboBoxModule, GridModule],
      providers: [
        { provide: NvmeofService, useClass: MockNvmeOfService },
        { provide: AuthStorageService, useClass: MockAuthStorageService },
        { provide: ModalService, useClass: MockModalService },
        { provide: TaskWrapperService, useClass: MockTaskWrapperService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NvmeofSubsystemsComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should retrieve subsystems from all gateway groups', fakeAsync(() => {
    component.getSubsystems();
    tick();
    expect(component.subsystems).toEqual(expectedSubsystems);
  }));

  it('should have correct table columns', () => {
    expect(component.subsystemsColumns.length).toBe(6);
    expect(component.subsystemsColumns.map((c) => c.prop)).toEqual([
      'nqn',
      'initiator_count',
      'gw_group',
      'namespace_count',
      'authentication',
      'encryption'
    ]);
  });

  it('should have correct table actions', () => {
    expect(component.tableActions.length).toBe(2);
    expect(component.tableActions[0].name).toBe('Create');
    expect(component.tableActions[1].name).toBe('Delete');
  });
});
