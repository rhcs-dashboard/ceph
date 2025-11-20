import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Step } from 'carbon-components-angular';
import { STEP_TITLES_MIRRORING_CONFIGURED } from './cephfs-mirroring-wizard-step.enum';
import { WizardStepsService } from '~/app/shared/services/wizard-steps.service';
import { WizardStepModel } from '~/app/shared/models/wizard-steps';

@Component({
  selector: 'cd-cephfs-mirroring-wizard',
  templateUrl: './cephfs-mirroring-wizard.component.html',
  standalone: false,
  styleUrls: ['./cephfs-mirroring-wizard.component.scss']
})
export class CephfsMirroringWizardComponent implements OnInit {
  stepTitles: Step[] = [];
  currentStep: WizardStepModel | null = null;
  currentStepIndex: number = 0;
  selectedRole: string = 'source';
  steps: any;
  lastStep: number = null;
  isWizardOpen: boolean = true;

  sourceList: string[] = [
    $localize`Sends data to remote clusters`,
    $localize`Requires bootstrap token from target`,
    $localize`Manages snapshot schedules`
  ];

  targetList: string[] = [
    $localize`Receives data from source clusters`,
    $localize`Generates bootstrap token`,
    $localize`Stores replicated snapshots`
  ];

  constructor(private wizardStepsService: WizardStepsService, private cdr: ChangeDetectorRef) {}

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
      this.currentStep = { ...this.currentStep, stepIndex: this.currentStep.stepIndex + 1 };
    }
  }

  closeWizard() {
    this.isWizardOpen = false;
  }
}
