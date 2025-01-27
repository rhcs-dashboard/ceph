import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RgwObjectListComponent } from './rgw-object-list.component';

describe('RgwObjectListComponent', () => {
  let component: RgwObjectListComponent;
  let fixture: ComponentFixture<RgwObjectListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RgwObjectListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RgwObjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
