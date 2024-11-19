import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmbClusterListComponent } from './smb-cluster-list.component';

describe('SmbClusterListComponent', () => {
  let component: SmbClusterListComponent;
  let fixture: ComponentFixture<SmbClusterListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SmbClusterListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SmbClusterListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
