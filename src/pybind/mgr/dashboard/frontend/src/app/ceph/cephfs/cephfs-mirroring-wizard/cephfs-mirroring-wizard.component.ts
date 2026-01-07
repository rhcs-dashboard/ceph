import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Step } from 'carbon-components-angular';
import { STEP_TITLES_MIRRORING_CONFIGURED } from './cephfs-mirroring-wizard-step.enum';
import { Icons } from '~/app/shared/enum/icons.enum';
import { WizardStepsService } from '~/app/shared/services/wizard-steps.service';
import { BehaviorSubject } from 'rxjs';
import { WizardStepModel } from '~/app/shared/models/wizard-steps';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'cd-cephfs-mirroring-wizard',
  templateUrl: './cephfs-mirroring-wizard.component.html',
  standalone: false,
  styleUrls: ['./cephfs-mirroring-wizard.component.scss']
})
export class CephfsMirroringWizardComponent implements OnInit {
  private wizardStepsService = inject(WizardStepsService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  stepTitles: Step[] = [];
  currentStep: WizardStepModel | null = null;
  currentStepIndex: number = 0;
  selectedRole: string = 'source';
  icons = Icons;
  selectedFilesystem$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  steps: any;
  lastStep: number = null;
  isWizardOpen: boolean = true;
  title: string = $localize`Create new CephFS mirroring`;
  description: string = $localize`Configure a new mirroring relationship between clusters`;
  form: FormGroup;

  sourceChecked: boolean = false;
  targetChecked: boolean = false;

  sourceList: string[] = [
    'Sends data to remote clusters',
    'Requires bootstrap token from target',
    'Manages snapshot schedules'
  ];

  targetList: string[] = [
    'Receives data from source clusters',
    'Generates bootstrap token',
    'Stores replicated snapshots'
  ];

  constructor() {
    this.form = this.fb.group({
      clusterRole1: [],
      clusterRole2: []
    });
  }

  ngOnInit() {
    if (!this.steps) {
      this.steps = [];
    }

    this.stepTitles = STEP_TITLES_MIRRORING_CONFIGURED.map((title, index) => ({
      label: title,
      onClick: () => this.goToStep(index)
    }));

    if (!this.steps || this.steps.length === 0) {
      this.steps = this.initializeSteps();
    }

    this.lastStep = this.steps.length - 1;

    this.wizardStepsService.setTotalSteps(this.stepTitles.length);

    this.wizardStepsService.getCurrentStep().subscribe((step) => {
      this.currentStep = step;
      this.currentStepIndex = step?.stepIndex || 0;
      this.cdr.detectChanges();
    });
  }

  initializeSteps(): WizardStepModel[] {
    return [
      { stepIndex: 0 } as WizardStepModel,
      { stepIndex: 1 } as WizardStepModel,
      { stepIndex: 2 } as WizardStepModel
    ];
  }

  goToStep(index: number) {
    this.wizardStepsService
      .getSteps()
      .subscribe((steps) => {
        const step = steps[index];
        if (step) {
          this.wizardStepsService.setCurrentStep(step);
        }
      })
      .unsubscribe();
  }

  onStepSelect(event: { step: Step; index: number }) {
    this.currentStep = this.steps[event.index];
  }

  onPrevious() {
    if (this.currentStep && this.currentStep.stepIndex !== 0) {
      this.currentStep = { ...this.currentStep, stepIndex: this.currentStep.stepIndex - 1 };
    }
  }

  onNext() {
    if (this.currentStep && !this.steps[this.currentStep.stepIndex].invalid) {
      this.currentStep = { ...this.currentStep, stepIndex: this.currentStep.stepIndex + 1 }; // Adjust stepIndex if needed
    }
  }

  updateSelectedFilesystem(filesystem: any) {
    this.selectedFilesystem$.next(filesystem);
  }

  closeWizard() {
    this.isWizardOpen = false;
  }
  onSubmit() {}

  onCancel(){
    this.router.navigate(['/cephfs/mirroring']);
  }
}
