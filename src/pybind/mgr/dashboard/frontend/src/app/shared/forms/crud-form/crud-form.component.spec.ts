import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { configureTestBed } from '~/testing/unit-test-helper';
import { CdDatePipe } from '~/app/shared/pipes/cd-date.pipe';
import { CrudFormComponent } from './crud-form.component';
import { RouterTestingModule } from '@angular/router/testing';
import { GridModule } from 'carbon-components-angular';

describe('CrudFormComponent', () => {
  let component: CrudFormComponent;
  let fixture: ComponentFixture<CrudFormComponent>;

  configureTestBed({
    imports: [RouterTestingModule, HttpClientTestingModule, GridModule],
    declarations: [CrudFormComponent],
    providers: [
      { provide: CdDatePipe, useValue: { transform: (d: any) => d } }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CrudFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
