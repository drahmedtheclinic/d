import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'ar' | 'en';

const translations: Record<string, string> = {
  'إغلاق': 'Close', 'إلغاء': 'Cancel', 'حفظ': 'Save', 'حفظ التعديلات': 'Save changes',
  'جاري الحفظ...': 'Saving...', 'جاري البحث...': 'Searching...', 'جاري التحميل...': 'Loading...',
  'تحديث': 'Refresh', 'مسح': 'Clear', 'فتح': 'Open', 'فتح الملف': 'Open record', 'رجوع': 'Back',
  'العودة للقائمة': 'Back to list', 'إغلاق القائمة': 'Close menu', 'فتح القائمة': 'Open menu',
  'السجلات': 'Records', 'الإحصائيات': 'Statistics', 'المساعدة': 'Reception', 'الدكتور': 'Doctor',
  'اختيار الدور': 'Select role', 'اسم الموظف': 'Staff name', 'حفظ الاسم': 'Save name', 'تعديل الاسم': 'Edit name',
  'الانتظار:': 'Waiting:', 'التنقل الرئيسي': 'Main navigation', 'سجلات المرضى': 'Patient records',
  'غرفة الكشف الطبي': 'Examination room', 'في الانتظار': 'Waiting', 'تم الكشف': 'Seen',
  'طابور الانتظار': 'Waiting queue', 'أرشيف المرضى': 'Patient archive', 'لا توجد سجلات': 'No records found',
  'لا توجد سجلات في الأرشيف': 'No records in the archive', 'لا توجد نتائج مطابقة': 'No matching results',
  'لا يوجد مرضى في الانتظار حالياً': 'There are no patients waiting right now',
  'نتائج البحث': 'Search results', 'مسجل': 'Registered', 'جديد': 'New', 'بدء الكشف': 'Start examination',
  'بحث برقم المريض أو بالاسم...': 'Search by patient number or name...',
  'اكتب رقم المريض (للإعادة) أو الاسم أو رقم الهاتف...': 'Enter patient number (for a return visit), name, or phone...',
  'مريض جديد (+ استمارة)': 'New patient (+ form)', 'إضافة مريض جديد': 'Add new patient',
  'إعادة كشف': 'Return visit', 'إرسال للدكتور': 'Send to doctor', 'إرسال المريض لإعادة الكشف': 'Send patient for a follow-up examination',
  'تعديل': 'Edit', 'حذف': 'Delete', 'الكل': 'All',
  'إحصائيات العيادة': 'Clinic statistics', 'إجمالي سجلات المرضى': 'Total patient records',
  'الإجمالي:': 'Total:', 'العدد:': 'Count:', 'انتظار': 'Waiting', 'في الانتظار حالياً': 'Currently waiting',
  'تصنيف الحالات': 'Case classification', 'مراجعات مقابل حالات جديدة': 'Follow-ups vs. new cases',
  'مراجعات واستشارات': 'Follow-ups and consultations', 'حالات جديدة (أول كشف)': 'New cases (first visit)',
  'مراحل الكشف': 'Examination stages', 'ملفات مسجلة': 'Registered records', 'ملفات نشطة': 'Active records',
  'منتهي': 'Completed', 'عرض أسبوعي': 'Weekly view', 'عرض يومي': 'Daily view',
  'مخطط دائري': 'Pie chart', 'مخطط عمودي': 'Bar chart', 'رجوع للسجلات': 'Back to records',
  'تحديث الإحصائيات': 'Refresh statistics', 'اللون الأخضر: حالات كشف جديدة': 'Green: new examination cases',
  'اللون البرتقالي: مراجعات ومتابعات': 'Orange: return visits and follow-ups',
  'جاري تجميع إحصائيات وسجلات العيادة...': 'Compiling clinic statistics and records...',
  'يتم استخراج أعداد المرضى والمراجعات والنسب البيانية': 'Calculating patient counts, follow-ups, and chart percentages',
  'استمارة مريض جديد': 'New patient form', 'اسم المريض ثلاثي أو رباعي...': 'Patient full name...',
  'الإسم /': 'Name /', 'الرقم :': 'Number:', 'السن :': 'Age:', 'العنوان :': 'Address:', 'ت :': 'Tel:',
  'المدينة / المنطقة...': 'City / area...', 'العنوان بالتفصيل...': 'Full address...', 'مثال: 34 سنة': 'e.g. 34 years',
  'مثال: 32 سنة': 'e.g. 32 years', 'رقم الملف...': 'File number...', 'رقم ملف المريض': 'Patient file number',
  'تلقائي': 'Auto', 'تلقائي عند الحفظ': 'Generated automatically',
  'C/O': 'C/O', 'O/E': 'O/E', 'Investigation': 'Investigation', 'Plan': 'Plan', 'Diagnosis': 'Diagnosis', 'R/': 'R/',
  'شكوى المريض والأعراض (Complaint of)...': 'Patient complaints and symptoms (Complaint of)...',
  'الفحص السريري والعلامات الحيوية (On Examination: BP, Pulse, Chest, Abdomen...)': 'Clinical exam and vital signs (BP, pulse, chest, abdomen...)',
  'الفحص السريري والعلامات الحيوية (On Examination)...': 'Clinical examination and vital signs...',
  'التحاليل والفحوصات المطلوبة والنتائج...': 'Requested tests and results...',
  'التحاليل والفحوصات والإشاعات المطلوبة ونتائجها...': 'Requested lab tests, imaging, and results...',
  'الخطة العلاجية والخطوات القادمة...': 'Treatment plan and next steps...',
  'التشخيص الطبي للحالة...': 'Medical diagnosis...', 'الروشتة والعلاج المقترح والجرعات...': 'Prescription, proposed treatment, and dosage...',
  'الروشتة والعلاج المقترح والجرعات وطريقة الاستخدام...': 'Prescription, treatment, dosage, and instructions...',
  'حفظ الكشف': 'Save examination', 'حفظ وإرسال للدكتور': 'Save and send to doctor',
  'فتح ملف المريض للإعادة': 'Open patient record for return visit', 'هذا الرقم مسجل بالفعل للمريض:': 'This number is already registered to:',
  'حفظ الاستمارة': 'Save form', 'طباعة الروشتة': 'Print prescription',
  'طباعة الروشتة R/': 'Print prescription R/', 'Follow - up Visits': 'Follow-up visits', '+ إضافة متابعة': '+ Add follow-up',
  'تسجيل زيارة متابعة جديدة': 'Record a new follow-up visit', 'التاريخ:': 'Date:', 'ملاحظات المتابعة والكشف:': 'Follow-up and examination notes:',
  'اكتب ملاحظات وتطورات الحالة، الضغط، التعديل على العلاج...': 'Enter notes about progress, blood pressure, or treatment changes...',
  'حفظ المتابعة': 'Save follow-up', 'لا توجد زيارات متابعة مسجلة حتى الآن': 'No follow-up visits have been recorded yet',
  'اضغط على زر "+ إضافة متابعة" لتسجيل أول استشارة': 'Click “+ Add follow-up” to record the first visit',
  'بواسطة:': 'By:', 'حذف ملف المريض': 'Delete patient record', 'حذف هذا المريض نهائيًا': 'Permanently delete this patient',
  'لم يتم العثور على ملف المريض': 'Patient record not found', 'جاري فتح ملف المريض...': 'Opening patient record...',
  'تعديل بيانات المريض': 'Edit patient details', 'رقم الهاتف مطلوب (ت :)': 'Phone number is required (Tel:)',
  'اسم المريض مطلوب (الإسم /)': 'Patient name is required (Name /)',
  'تعذر إنشاء رقم ملف تلقائي. حاول مرة أخرى.': 'Could not generate a file number automatically. Please try again.',
  'جاري إنشاء رقم الملف تلقائياً، حاول بعد لحظة.': 'Generating a file number. Please try again in a moment.',
  'تعذر تحميل بيانات المريض': 'Could not load patient details', 'تم حفظ الاستمارة الطبية بنجاح': 'Medical form saved successfully',
  'حدث خطأ أثناء حفظ الملف': 'An error occurred while saving the record', 'تم إرسال المريض إلى قائمة الانتظار': 'Patient sent to the waiting queue',
  'حدث خطأ أثناء إرسال المريض': 'An error occurred while sending the patient', 'تم الكشف وتسجيل الفحص بنجاح': 'Examination completed and recorded',
  'حدث خطأ أثناء تحديث حالة الكشف': 'An error occurred while updating examination status',
  'يرجى كتابة ملاحظات المتابعة': 'Please enter follow-up notes', 'تم تسجيل المتابعة وإرسال المريض لقائمة الانتظار': 'Follow-up recorded and patient sent to the waiting queue',
  'تم تسجيل زيارة المتابعة': 'Follow-up visit recorded', 'حدث خطأ أثناء حفظ المتابعة': 'An error occurred while saving the follow-up',
  'إغلاق استمارة المريض': 'Close patient form', 'إغلاق معاينة الروشتة': 'Close prescription preview',
  'اسم المريض:': 'Patient name:', 'التشخيص الطبي (Diagnosis):': 'Medical diagnosis:',
  'السن:': 'Age:', 'الهاتف:': 'Phone:', 'كود الملف:': 'File code:', 'توقيع وختم الطبيب المعالج': 'Treating physician signature and stamp',
  'طباعة الروشتة الآن': 'Print prescription now', 'معاينة الروشتة الطبية للطباعة (Prescription R/)': 'Prescription preview (R/)',
  'لم يتم كتابة علاج أو روشتة حتى الآن في هذا الملف.': 'No treatment or prescription has been entered for this record yet.',
  'حذف نهائيًا': 'Delete permanently', 'حذف نهائي — لا يمكن التراجع عنه': 'Permanent deletion — this cannot be undone',
  'الرقم المدخل غير مطابق لرقم ملف هذا المريض.': 'The entered number does not match this patient’s file number.',
  'سيتم حذف الاستمارة الطبية بالكامل (التشخيص والروشتة وكل الحقول).': 'The full medical form will be deleted (diagnosis, prescription, and all fields).',
  'سيتم حذف جميع زيارات المتابعة الخاصة بهذا المريض أيضًا.': 'All follow-up visits for this patient will also be deleted.',
  'لن يظهر المريض بعد ذلك في البحث أو القوائم أو طابور الانتظار.': 'The patient will no longer appear in search, lists, or the waiting queue.',
  'إعادة تحميل التطبيق': 'Reload application', 'حدث تنبيه غير متوقع': 'An unexpected error occurred',
  'يمكنك إعادة تحميل الصفحة لاستئناف العمل بالعيادة.': 'Reload the page to resume using the clinic application.',
  'إغلاق التنبيه': 'Dismiss notification', 'اضغط لبدء الكشف': 'Click to start the examination',
  'العنوان: 15 شارع النصر، المعادي، القاهرة': 'Address: 15 El Nasr Street, Maadi, Cairo',
  'تعديل بيانات المريض (الاسم، الهاتف، السن، العنوان، الرقم)': 'Edit patient details (name, phone, age, address, number)',
  'توزيع عدد المرضى بين الحالات الجديدة والمراجعات الدورية': 'Distribution of new cases and follow-up visits',
  'جاري تحديث الانتظار...': 'Updating the waiting queue...', 'حذف ملف المريض نهائيًا': 'Permanently delete patient record',
  'د. أحمد عوض - الرئيسية': 'Dr. Ahmed Awad - Home', 'للتأكيد، اكتب كلمة «حذف» في الحقل التالي:': 'To confirm, type “delete” in the field below:',
  'للحجز والاستفسار: 01012345678 • مواعيد العيادة: يومياً 4 - 10 مساءً': 'Appointments and inquiries: 01012345678 • Clinic hours: daily, 4–10 PM',
  'يتم إنشاء رقم ملف فريد تلقائياً': 'A unique file number is generated automatically',
  'منذ لحظات': 'Just now', 'منذ دقيقة': '1 minute ago', 'منذ دقيقتين': '2 minutes ago',
  'منذ دقائق': 'minutes ago', 'منذ ساعة': 'hour ago',
  'إعادة كشف (إرسال للدكتور)': 'Return visit (send to doctor)',
  'إعادة إرسال': 'Resend', 'آخر تحديث بواسطة:': 'Last updated by:', 'التاريخ': 'Date',
  'الأرشيف': 'Archive',
  'تم فحص': 'Examined', 'حالة': 'cases', 'من الإقبال': 'of visits',
  'معدل تسجيل المرضى': 'Patient registration rate', 'يومياً خلال الأسبوع': 'daily over the week',
  'أسبوعياً خلال الشهر': 'weekly over the month', 'منذ': 'ago',
  'حالات جديدة': 'New cases', 'مراجعات واستشارات (متابعة)': 'Follow-ups and consultations',
  'تعذر تحميل إحصائيات العيادة': 'Could not load clinic statistics',
  'حدث خطأ أثناء حفظ استمارة المريض': 'An error occurred while saving the patient form',
  'حدث خطأ أثناء حذف ملف المريض': 'An error occurred while deleting the patient record',
  'الأحد': 'Sun', 'الإثنين': 'Mon', 'الثلاثاء': 'Tue', 'الأربعاء': 'Wed',
  'الخميس': 'Thu', 'الجمعة': 'Fri', 'السبت': 'Sat',
  'منذ 3 أسابيع': '3 weeks ago', 'منذ أسبوعين': '2 weeks ago',
  'الأسبوع الماضي': 'Last week', 'الأسبوع الحالي': 'This week',
  'اكتب رقم الملف أولًا لتفعيل الحذف': 'Enter the file number first to enable deletion',
  'جاري الحذف...': 'Deleting...', 'حذف المريض نهائيًا': 'Permanently delete patient',
  'حذف نهائي لهذا المريض وكل زيارات المتابعة الخاصة به من قاعدة البيانات. استخدمه عند تسجيل ملف مكرر أو بالخطأ — لا يمكن التراجع بعد الحذف.': 'Permanently delete this patient and all follow-up visits from the database. Use this for duplicate or mistakenly created records. This action cannot be undone.',
  'هذه النافذة لتعديل البيانات الأساسية للمريض. لتعديل البيانات الطبية (الشكوى، التشخيص، الروشتة R/) افتح ملف المريض وعدّل الاستمارة ثم اضغط «حفظ التعديلات».': 'This window edits the patient’s basic details. To edit clinical details (complaint, diagnosis, prescription), open the patient record, edit the form, and save your changes.',
  'حدث خطأ أثناء حفظ تعديلات المريض': 'An error occurred while saving patient changes',
  'تعذر تحميل القائمة': 'Could not load the list',
  'تعذر الاتصال بـ Realtime Database: تأكد من تفعيل صلاحيات القراءة والكتابة في Rules': 'Could not connect to Realtime Database. Check that read and write permissions are enabled in the rules.',
  'تم تسجيل المريض وإرساله لقائمة الانتظار': 'Patient registered and sent to the waiting queue',
  'تم تسجيل ملف المريض': 'Patient record created',
  'رقم الملف': 'File number',
};

interface LanguageContextValue {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (arabicText: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    localStorage.getItem('clinic_language') === 'en' ? 'en' : 'ar'
  );

  const setLanguage = (next: Language) => {
    localStorage.setItem('clinic_language', next);
    setLanguageState(next);
  };
  const toggleLanguage = () => setLanguage(language === 'ar' ? 'en' : 'ar');
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    direction: language === 'ar' ? 'rtl' : 'ltr',
    setLanguage,
    toggleLanguage,
    t: (text: string) => language === 'ar' ? text : (translations[text] || text),
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
