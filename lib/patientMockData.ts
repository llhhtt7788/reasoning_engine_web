import type {
  Patient,
  PatientDiagnosis,
  MDTSession,
  MDTReport,
  PatientStatistics,
} from '@/types/patient';

// Mock患者数据
export const mockPatients: Patient[] = [
  {
    id: '1',
    name: '李建国',
    admissionNumber: 'ZY2023051289',
    gender: '男',
    age: 68,
    birthDate: '1955-03-15',
    ethnicity: '汉族',
    maritalStatus: '已婚',
    occupation: '退休工人',
    phone: '138****5678',
    emergencyContact: {
      name: '李小红',
      relation: '女儿',
      phone: '139****8765',
    },
    address: '北京市海淀区XX街道XXX巷XX号3楼5单元101',
    department: '肺外科',
    ward: '3病区',
    bed: '12床',
    admissionDate: '2023-05-10',
    primaryDoctor: '张伟',
    primaryDoctorDept: '肺外科',
    primaryDiagnosis: '右肺上叶腺癌(cT2aN1M0，IIB期)',
    relatedDepartments: ['影像科', '肺外科'],
    mdtStatus: 'ongoing',
    createdAt: '2023-05-12',
    medicalSummary:
      '患者因"咳嗽咳痰3月余，发现右肺占位1周"入院。患者2月前无明显诱因出现咳嗽、咳痰，为白色黏痰，量不多，无痰中带血，无发热、胸闷、气短等症状。1周前于当地医院行胸部CT检查示：右肺上叶占位。',
    pastHistory:
      '既往史：有高血压病史10年，最高血压160/95mmHg，规律服用降压药控制，血压控制尚可。否认糖尿病、冠心病史。否认肝炎、结核病史。否认手术外伤史。',
    admissionVitals:
      '入院体征：T 36.5℃，P 82次/分，R 18次/呼吸，BP 135/85mmHg。神志清，精神可，呼吸平，查体配合。双肺呼吸音清，未闻及明显干湿性啰音。心律齐，各瓣膜听诊区未闻及杂音。腹平软，无压痛、反跳痛，肝脾未触及。双下肢无水肿。',
  },
  {
    id: '2',
    name: '王秀兰',
    admissionNumber: 'ZY2023051045',
    gender: '女',
    age: 54,
    birthDate: '1969-08-22',
    ethnicity: '汉族',
    maritalStatus: '已婚',
    occupation: '教师',
    phone: '136****1234',
    emergencyContact: {
      name: '王强',
      relation: '丈夫',
      phone: '137****5678',
    },
    address: '北京市朝阳区XX路XX号',
    department: '肿瘤科',
    ward: '2病区',
    bed: '8床',
    admissionDate: '2023-05-08',
    primaryDoctor: '李明',
    primaryDoctorDept: '外科',
    primaryDiagnosis: '胃癌术后化疗方案',
    relatedDepartments: ['外科', '肿瘤科'],
    mdtStatus: 'completed',
    createdAt: '2023-05-10',
    medicalSummary: '患者胃癌术后，需制定后续化疗方案。',
    pastHistory: '否认高血压、糖尿病病史。',
    admissionVitals: 'T 36.8℃，P 78次/分，R 16次/呼吸，BP 120/80mmHg。',
  },
  {
    id: '3',
    name: '张伟明',
    admissionNumber: 'ZY2023050912',
    gender: '男',
    age: 72,
    birthDate: '1951-12-05',
    ethnicity: '汉族',
    maritalStatus: '已婚',
    occupation: '退休干部',
    phone: '135****9876',
    emergencyContact: {
      name: '张丽',
      relation: '女儿',
      phone: '138****4321',
    },
    address: '北京市西城区XX街XX号',
    department: '肝胆外科',
    ward: '1病区',
    bed: '15床',
    admissionDate: '2023-05-07',
    primaryDoctor: '赵医生',
    primaryDoctorDept: '主治',
    primaryDiagnosis: '肝占位性病变',
    relatedDepartments: ['主治', '肝胆外科'],
    mdtStatus: 'not_started',
    createdAt: '2023-05-09',
    medicalSummary: '患者发现肝占位性病变，需进一步诊断。',
    pastHistory: '有糖尿病病史5年。',
    admissionVitals: 'T 37.0℃，P 80次/分，R 18次/呼吸，BP 140/90mmHg。',
  },
  {
    id: '4',
    name: '张丽华',
    admissionNumber: 'ZY2023050876',
    gender: '女',
    age: 45,
    birthDate: '1978-03-18',
    ethnicity: '汉族',
    maritalStatus: '已婚',
    occupation: '会计',
    phone: '139****2468',
    emergencyContact: {
      name: '刘强',
      relation: '丈夫',
      phone: '138****1357',
    },
    address: '北京市东城区XX路XX号',
    department: '乳腺外科',
    ward: '4病区',
    bed: '6床',
    admissionDate: '2023-05-06',
    primaryDoctor: '孙医生',
    primaryDoctorDept: '超检',
    primaryDiagnosis: '乳腺癌综合治疗',
    relatedDepartments: ['超检', '乳腺外科'],
    mdtStatus: 'ongoing',
    createdAt: '2023-05-08',
    medicalSummary: '患者乳腺癌确诊，需制定综合治疗方案。',
    pastHistory: '无特殊病史。',
    admissionVitals: 'T 36.6℃，P 75次/分，R 16次/呼吸，BP 118/75mmHg。',
  },
  {
    id: '5',
    name: '陈志强',
    admissionNumber: 'ZY2023050732',
    gender: '男',
    age: 58,
    birthDate: '1965-07-12',
    ethnicity: '汉族',
    maritalStatus: '已婚',
    occupation: '工程师',
    phone: '137****8642',
    emergencyContact: {
      name: '陈芳',
      relation: '妻子',
      phone: '136****9753',
    },
    address: '北京市丰台区XX街XX号',
    department: '胃肠外科',
    ward: '2病区',
    bed: '20床',
    admissionDate: '2023-05-05',
    primaryDoctor: '周医生',
    primaryDoctorDept: '手术',
    primaryDiagnosis: '结直肠术后复查',
    relatedDepartments: ['手术', '胃肠外科'],
    mdtStatus: 'completed',
    createdAt: '2023-05-07',
    medicalSummary: '患者结直肠术后，定期复查。',
    pastHistory: '有高血压病史8年。',
    admissionVitals: 'T 36.7℃，P 76次/分，R 17次/呼吸，BP 130/85mmHg。',
  },
];

// Mock诊断信息
export const mockDiagnoses: PatientDiagnosis[] = [
  {
    id: '1',
    patientId: '1',
    type: '主要诊断',
    name: '右肺上叶腺癌(cT2aN1M0，IIB期)',
    date: '2023-05-12',
  },
  {
    id: '2',
    patientId: '1',
    type: '其他诊断',
    name: '高血压2级（很高危组）',
    date: '2023-05-10',
  },
  {
    id: '3',
    patientId: '1',
    type: '其他诊断',
    name: '2型糖尿病',
    date: '2023-05-10',
  },
];

// Mock MDT会诊信息
export const mockMDTSessions: MDTSession[] = [
  {
    id: '1',
    code: 'MDT-20230513-008',
    patientId: '1',
    applicantDept: '肺胸科',
    host: '李明',
    hostTitle: '主任医师',
    startTime: '2023-05-13 14:00',
    participatingDepts: ['影像科', '病理科', '外科', '内科'],
    status: 'ongoing',
  },
];

export const mockMDTReports: MDTReport[] = [
  {
    id: '1',
    sessionId: '1',
    patientId: '1',
    code: 'MDT-20230513-008',
    status: 'completed',
    createdAt: '2023-05-13 16:45',
    applicantDept: '肺外科',
    host: '李明',
    hostTitle: '主任医师',
    recorder: '王芳',
    recorderTitle: '主治医师',
    participatingDepts: ['影像科', '病理科', '外科', '内科'],
    consensusRate: 0.85,
    mainDiagnosis: '右肺上叶腺癌(cT2aN1M0，IIB期)',
    baseDiseases: ['高血压', '2型糖尿病'],
    mainConclusion:
      '建议行胸腔镜下右肺上叶切除+系统性纵隔淋巴结清扫术，术后根据恢复情况于3-4周开始辅助靶向治疗（奥希替尼80mg qd，治疗周期3年）。',
    opinions: [
      {
        dept: '影像科意见',
        content:
          '右肺上叶占位，大小约3.5×2.8cm，边界不清，可见毛刺征；纵隔淋巴结增大，短径约1.2cm，未见远处转移征象。',
      },
      {
        dept: '病理科意见',
        content:
          'CT引导下穿刺活检提示：腺癌，分化中等；EGFR exon 19缺失突变阳性。',
      },
      {
        dept: '外科意见',
        content:
          '患者右肺上叶腺癌明确，肿瘤可切除，建议行胸腔镜下右肺上叶切除+系统性纵隔淋巴结清扫术。',
      },
      {
        dept: '内科意见',
        content:
          '根据病理结果，建议术后行辅助靶向治疗，奥希替尼80mg qd，疗程3年。',
      },
      {
        dept: '放疗科意见',
        content:
          '目前无明确放疗指征，如术后出现N2淋巴结转移，可考虑纵隔区域辅助放疗。',
      },
    ],
    treatmentPlan: [
      {
        phase: '术前准备',
        plan: '完善肺功能、心评估，控制血压、血糖',
        time: '2023-05-14至2023-05-18',
        dept: '胸外科、麻醉科',
      },
      {
        phase: '手术治疗',
        plan: '胸腔镜下右肺上叶切除+系统性纵隔淋巴结清扫术',
        time: '2023-05-19',
        dept: '胸外科',
      },
      {
        phase: '术后恢复',
        plan: '术后监护、疼痛管理、呼吸功能锻炼',
        time: '2023-05-19至2023-05-26',
        dept: '胸外科、康复科',
      },
      {
        phase: '辅助治疗',
        plan: '奥希替尼80mg qd，口服，治疗周期3年',
        time: '2023-06-12开始',
        dept: '肿瘤科',
      },
    ],
    followUpPlan: [
      {
        time: '术后1个月',
        content: '体格检查、血常规、生化、肺癌标志物、胸部CT',
        dept: '胸外科',
      },
      {
        time: '术后3个月',
        content: '体格检查、血常规、生化、肺癌标志物、胸部CT、腹部超声',
        dept: '肿瘤科',
      },
      {
        time: '术后6个月',
        content: '体格检查、血常规、生化、肺癌标志物、胸部CT、腹部超声、头颅MRI',
        dept: '肿瘤科',
      },
      {
        time: '术后1年',
        content: '体格检查、血常规、生化、肺癌标志物、胸部CT、腹部超声、头颅MRI、骨扫描',
        dept: '肿瘤科',
      },
    ],
  },
];

// Mock统计数据
export const mockPatientStatistics: PatientStatistics = {
  total: 128,
  totalChange: 12,
  ongoingMDT: 12,
  ongoingMDTNew: 3,
  completedMDT: 86,
  completedMDTChange: 8,
  notStartedMDT: 30,
};

// 科室列表
export const mockDepartments = [
  '全部科室',
  'MDT科室',
  '影像科',
  '病理科',
  '外科',
  '内科',
  '肺外科',
  '肿瘤科',
  '肝胆外科',
  '乳腺外科',
  '胃肠外科',
];

// 病种列表
export const mockDiseases = [
  '全部病种',
  '肺癌',
  '胃癌',
  '肝癌',
  '乳腺癌',
  '结直肠癌',
];
