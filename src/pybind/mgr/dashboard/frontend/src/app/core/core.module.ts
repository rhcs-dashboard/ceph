import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ErrorComponent } from './error/error.component';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { NavigationModule } from './navigation/navigation.module';
import { NotFoundComponent } from './not-found/not-found.component';

@NgModule({
  imports: [CommonModule, NavigationModule],
  exports: [NavigationModule],
  declarations: [NotFoundComponent, ForbiddenComponent, ErrorComponent]
})
export class CoreModule {}
