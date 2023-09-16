export interface GetGroupsOptions {
  id?: string;
  display?: string;
  course?: Course | Course[];
  form?: Form | Form[];
  faculty?: Faculty | Faculty[];
}

export interface RawGroup {
  id: string;
  display: string;
  course: number;
  form: number;
  faculty: number;
  course_human: string;
  form_human: string;
  faculty_human: string;
}

export enum Form {
  FullTime,
  PartTime,
  PartTimeReduced
}

export enum Faculty {
  Magistracy,
  Economical,
  Legal
}

export enum Course {
  First,
  Second,
  Third,
  Fourth,
  Fifth
}

export interface Group extends RawGroup {
  course: Course;
  form: Form;
  faculty: Faculty;
}