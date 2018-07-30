import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, Routes } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { ToastModule } from 'ng2-toastr';
import { of } from 'rxjs';

import { configureTestBed } from '../../../../testing/unit-test-helper';
import { RoleService } from '../../../shared/api/role.service';
import { ScopeService } from '../../../shared/api/scope.service';
import { ComponentsModule } from '../../../shared/components/components.module';
import { CdFormGroup } from '../../../shared/forms/cd-form-group';
import { NotificationService } from '../../../shared/services/notification.service';
import { SharedModule } from '../../../shared/shared.module';
import { RoleFormComponent } from './role-form.component';
import { RoleFormModel } from './role-form.model';

describe('RoleFormComponent', () => {
  let component: RoleFormComponent;
  let form: CdFormGroup;
  let fixture: ComponentFixture<RoleFormComponent>;
  let httpTesting: HttpTestingController;
  let roleService: RoleService;
  let router: Router;
  const setUrl = (url) => Object.defineProperty(router, 'url', { value: url });

  @Component({ selector: 'cd-fake', template: '' })
  class FakeComponent {}

  const routes: Routes = [{ path: 'roles', component: FakeComponent }];

  configureTestBed(
    {
      imports: [
        [RouterTestingModule.withRoutes(routes)],
        HttpClientTestingModule,
        ReactiveFormsModule,
        RouterTestingModule,
        ComponentsModule,
        ToastModule.forRoot(),
        SharedModule
      ],
      declarations: [RoleFormComponent, FakeComponent]
    },
    true
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(RoleFormComponent);
    component = fixture.componentInstance;
    form = component.roleForm;
    httpTesting = TestBed.get(HttpTestingController);
    roleService = TestBed.get(RoleService);
    router = TestBed.get(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
    const notify = TestBed.get(NotificationService);
    spyOn(notify, 'show');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(form).toBeTruthy();
  });

  describe('create mode', () => {
    beforeEach(() => {
      setUrl('/user-management/roles/add');
      component.ngOnInit();
    });

    it('should not disable fields', () => {
      ['name', 'description', 'scopes_permissions'].forEach((key) =>
        expect(form.get(key).disabled).toBeFalsy()
      );
    });

    it('should validate name required', () => {
      form.get('name').setValue('');
      expect(form.get('name').hasError('required')).toBeTruthy();
    });

    it('should set mode', () => {
      expect(component.mode).toBeUndefined();
    });

    it('should submit', () => {
      const role: RoleFormModel = {
        name: 'role1',
        description: 'Role 1',
        scopes_permissions: { osd: ['read'] }
      };
      Object.keys(role).forEach((k) => form.get(k).setValue(role[k]));
      component.submit();
      const roleReq = httpTesting.expectOne('api/role');
      expect(roleReq.request.method).toBe('POST');
      expect(roleReq.request.body).toEqual(role);
      roleReq.flush({});
      expect(router.navigate).toHaveBeenCalledWith(['/user-management/roles']);
    });
  });

  describe('edit mode', () => {
    const role: RoleFormModel = {
      name: 'role1',
      description: 'Role 1',
      scopes_permissions: { osd: ['read', 'create'] }
    };
    const scopes = ['osd', 'user'];
    beforeEach(() => {
      spyOn(roleService, 'get').and.callFake(() => of(role));
      spyOn(TestBed.get(ScopeService), 'list').and.callFake(() => of(scopes));
      setUrl('/user-management/roles/edit/role1');
      component.ngOnInit();
      const reqScopes = httpTesting.expectOne('ui-api/scope');
      expect(reqScopes.request.method).toBe('GET');
      reqScopes.flush(scopes);
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('should disable fields if editing', () => {
      expect(form.get('name').disabled).toBeTruthy();
      ['description', 'scopes_permissions'].forEach((key) =>
        expect(form.get(key).disabled).toBeFalsy()
      );
    });

    it('should set control values', () => {
      ['name', 'description', 'scopes_permissions'].forEach((key) =>
        expect(form.getValue(key)).toBe(role[key])
      );
    });

    it('should set mode', () => {
      expect(component.mode).toBe('editing');
    });

    it('should submit', () => {
      component.submit();
      component.hadlePermissionClick('osd', 'update');
      component.hadlePermissionClick('osd', 'create');
      component.hadlePermissionClick('user', 'read');
      const roleReq = httpTesting.expectOne(`api/role/${role.name}`);
      expect(roleReq.request.method).toBe('PUT');
      expect(roleReq.request.body).toEqual({
        name: 'role1',
        description: 'Role 1',
        scopes_permissions: { osd: ['read', 'update'], user: ['read'] }
      });
      roleReq.flush({});
      expect(router.navigate).toHaveBeenCalledWith(['/user-management/roles']);
    });
  });
});
