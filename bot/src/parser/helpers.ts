import { Course, Faculty, Form } from './interfaces'

export const formToIdMap = {
  [Form.FullTime]: 'Dnevnaya',
  [Form.PartTime]: 'Zaochnaya',
  [Form.PartTimeReduced]: 'Zaochnaya sokrashhennaya'
}

export const facultyToIdMap = {
  [Faculty.Magistracy]: 'Magistratura',
  [Faculty.Economical]: 'E`konomicheskij',
  [Faculty.Legal]: 'YUridicheskij'
}

export const courseToIdMap = {
  [Course.First]: '1 kurs',
  [Course.Second]: '2 kurs',
  [Course.Third]: '3 kurs',
  [Course.Fourth]: '4 kurs',
  [Course.Fifth]: '5 kurs'
}