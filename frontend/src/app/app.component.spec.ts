// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { AppComponent } from './app.component';
// import { ReactiveFormsModule } from '@angular/forms';
// import { Component } from '@angular/core';

// describe('AppComponent', () => {
//   let component: AppComponent;
//   let fixture: ComponentFixture<AppComponent>;
//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [AppComponent, ReactiveFormsModule],
//       // declarations: [AppComponent],
//     }).compileComponents();
//     fixture = TestBed.createComponent(AppComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create the app', () => {
//     const fixture = TestBed.createComponent(AppComponent);
//     const app = fixture.componentInstance;
//     expect(app).toBeTruthy();
//   });

//   it(`should have the 'frontend' title`, () => {
//     const fixture = TestBed.createComponent(AppComponent);
//     const app = fixture.componentInstance;
//     expect(app.title).toEqual('frontend');
//   });

//   it('should render title', () => {
//     const fixture = TestBed.createComponent(AppComponent);
//     fixture.detectChanges();
//     const compiled = fixture.nativeElement as HTMLElement;
//     expect(compiled.querySelector('h1')?.textContent).toContain(
//       'Hello Angular 19'
//     );
//   });

//   it('Reactive Form Validation - Name check', () => {
//     let fullName = component.registrationForm.controls['name'];
//     expect(fullName.valid).toBeFalsy();
//     expect(fullName.errors?.['required']).toBeTruthy();
//   });

//   it('Reactive Form Validation - Set Name check', () => {
//     let fullName = component.registrationForm.controls['name'];
//     fullName.setValue('Atanu Paul');
//     expect(fullName.valid).toBeTruthy();
//     expect(fullName.value).toEqual('Atanu Paul');
//   });

//   it('Reactive Form Validation - Email Check', () => {
//     let email = component.registrationForm.controls['email'];
//     expect(email.valid).toBeFalse();
//     expect(email.errors?.['required']).toBeTruthy();
//   });

//   it('Reactive Form Validation - set invalid Email Check', () => {
//     let email = component.registrationForm.controls['email'];
//     email.setValue('atanu@.com');
//     expect(email.valid).toBeFalsy();
//     expect(email.errors?.['email']).toBeTruthy();
//   });

//   it('Reactive Form Validation - Set correct Email Check', () => {
//     let email = component.registrationForm.controls['email'];
//     email.setValue('atanu.paul@collatzinc.com');
//     expect(email.valid).toBeTruthy();
//     expect(email.value).toContain('atanu.paul@collatzinc.com');
//   });

//   const testCases = [
//     { value: 'atanu.paul@collatzinc.com', valid: true },
//     { value: 'atanu.name@collatzinc.com', valid: true },
//     { value: 'atanu@sub.collatzinc.co.in', valid: true },
//     { value: 'atanu@123.123.123.123', valid: true },
//     { value: 'atanu@.com', valid: false },
//     // { value: 'atanu@com', valid: false },
//     { value: '@collatzinc.com', valid: false },
//     { value: 'atanu@ collatzinc.com', valid: false },
//     { value: 'atanuexample.com', valid: false },
//   ];

//   it('Reactive Form Validation - Email Multiple Cases', () => {
//     let email = component.registrationForm.controls['email'];
//     testCases.forEach(({ value, valid }) => {
//       email.setValue(value);
//       expect(email.valid).withContext(`Failed for email: ${value}`).toBe(valid);
//     });
//   });

//   it('Reactive Form Validation - age check', () => {
//     let age = component.registrationForm.controls['age'];
//     expect(age.valid).toBeFalsy();
//     expect(age.errors?.['required']).toBeTruthy();
//   });

//   it('Reactive Form Validation - Age should be greater than 18 and less than 17 should fail', () => {
//     let age = component.registrationForm.controls['age'];
//     age.setValue(17);
//     expect(age.valid).toBeFalsy();
//     expect(age.errors?.['min']).toBeTruthy();

//     age.setValue(18);
//     expect(age.valid).toBeTruthy();
//     expect(age.value).toBeGreaterThanOrEqual(18);
//   });
// });
