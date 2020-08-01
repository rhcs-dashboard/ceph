import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { of } from 'rxjs';

import { RgwUserService } from '~/app/shared/api/rgw-user.service';
import { TableActionsComponent } from '~/app/shared/datatable/table-actions/table-actions.component';
import { CdTableFetchDataContext } from '~/app/shared/models/cd-table-fetch-data-context';
import { SharedModule } from '~/app/shared/shared.module';
import { configureTestBed, PermissionHelper } from '~/testing/unit-test-helper';
import { RgwUserListComponent } from './rgw-user-list.component';

describe('RgwUserListComponent', () => {
  let component: RgwUserListComponent;
  let fixture: ComponentFixture<RgwUserListComponent>;
  let rgwUserService: RgwUserService;
  let rgwUserServiceListSpy: jasmine.Spy;

  configureTestBed({
    declarations: [RgwUserListComponent],
    imports: [BrowserAnimationsModule, RouterTestingModule, HttpClientTestingModule, SharedModule],
    schemas: [NO_ERRORS_SCHEMA]
  });

  beforeEach(() => {
    rgwUserService = TestBed.inject(RgwUserService);
    rgwUserServiceListSpy = spyOn(rgwUserService, 'list');
    rgwUserServiceListSpy.and.returnValue(of(null));
    fixture = TestBed.createComponent(RgwUserListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should test all TableActions combinations', () => {
    const permissionHelper: PermissionHelper = new PermissionHelper(component.permission);
    const tableActions: TableActionsComponent = permissionHelper.setPermissionsAndGetActions(
      component.tableActions
    );

    expect(tableActions).toEqual({
      'create,update,delete': {
        actions: ['Create', 'Edit', 'Delete'],
        primary: { multiple: 'Delete', executing: 'Edit', single: 'Edit', no: 'Create' }
      },
      'create,update': {
        actions: ['Create', 'Edit'],
        primary: { multiple: 'Create', executing: 'Edit', single: 'Edit', no: 'Create' }
      },
      'create,delete': {
        actions: ['Create', 'Delete'],
        primary: { multiple: 'Delete', executing: 'Create', single: 'Create', no: 'Create' }
      },
      create: {
        actions: ['Create'],
        primary: { multiple: 'Create', executing: 'Create', single: 'Create', no: 'Create' }
      },
      'update,delete': {
        actions: ['Edit', 'Delete'],
        primary: { multiple: 'Delete', executing: 'Edit', single: 'Edit', no: 'Edit' }
      },
      update: {
        actions: ['Edit'],
        primary: { multiple: 'Edit', executing: 'Edit', single: 'Edit', no: 'Edit' }
      },
      delete: {
        actions: ['Delete'],
        primary: { multiple: 'Delete', executing: 'Delete', single: 'Delete', no: 'Delete' }
      },
      'no-permissions': {
        actions: [],
        primary: { multiple: '', executing: '', single: '', no: '' }
      }
    });
  });

  it('should test if rgw-user data is tranformed correctly', fakeAsync(() => {
    rgwUserServiceListSpy.and.returnValue(
      of([
        {
          user_id: 'testid',
          stats: {
            size_actual: 6,
            num_objects: 6
          },
          user_quota: {
            max_size: 20,
            max_objects: 10,
            enabled: true
          }
        }
      ])
    );
    const context: CdTableFetchDataContext = null;
    component.getUserList(context);
    tick(10000);
    expect(component.users).toEqual([
      {
        user_id: 'testid',
        stats: {
          size_actual: 6,
          num_objects: 6
        },
        user_quota: {
          max_size: 20,
          max_objects: 10,
          enabled: true
        }
      }
    ]);
  }));

  it('should usage bars only if quota enabled', fakeAsync(() => {
    rgwUserServiceListSpy.and.returnValue(
      of([
        {
          user_id: 'testid',
          stats: {
            size_actual: 6,
            num_objects: 6
          },
          user_quota: {
            max_size: 1024,
            max_objects: 10,
            enabled: true
          }
        }
      ])
    );
    const context: CdTableFetchDataContext = null;
    component.getUserList(context);
    tick(10000);
    // flush();
    // discardPeriodicTasks();
    const usageBars = fixture.debugElement.nativeElement.querySelectorAll('cd-usage-bar');
    expect(usageBars.length).toBe(2);
  }));

  it('should not show any usage bars if quota disabled', fakeAsync(() => {
    rgwUserServiceListSpy.and.returnValue(
      of([
        {
          user_id: 'testid',
          stats: {
            size_actual: 6,
            num_objects: 6
          },
          user_quota: {
            max_size: 1024,
            max_objects: 10,
            enabled: false
          }
        }
      ])
    );
    const context: CdTableFetchDataContext = null;
    component.getUserList(context);
    flush();
    discardPeriodicTasks();
    const usageBars = fixture.debugElement.nativeElement.querySelectorAll('cd-usage-bar');
    expect(usageBars.length).toBe(0);
  }));
});
