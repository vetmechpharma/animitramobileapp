"""
Comprehensive India States, Districts, and Taluks data
"""

LOCATIONS = {
    "Andhra Pradesh": {
        "Anantapur": ["Anantapur", "Dharmavaram", "Guntakal", "Hindupur", "Kadiri", "Kalyanadurgam", "Rayadurgam", "Tadpatri", "Uravakonda"],
        "Chittoor": ["Chittoor", "Madanapalle", "Palamaner", "Puttur", "Srikalahasti", "Tirupati"],
        "East Godavari": ["Amalapuram", "Kakinada", "Peddapuram", "Rajam", "Rajamahendravaram", "Ramachandrapuram", "Tuni"],
        "Guntur": ["Bapatla", "Chilakaluripet", "Guntur", "Macherla", "Narasaraopet", "Palnad", "Sattenapalle", "Tenali"],
        "Krishna": ["Gudivada", "Machilipatnam", "Nandigama", "Vijayawada"],
        "Kurnool": ["Adoni", "Allagadda", "Atmakur", "Kurnool", "Nandyal", "Yemmiganur"],
        "Nellore": ["Atmakur", "Kavali", "Nellore", "Naidupet", "Gudur", "Sullurpeta"],
        "Prakasam": ["Addanki", "Chirala", "Darsi", "Giddalur", "Kandukur", "Kanigiri", "Markapur", "Ongole", "Podili"],
        "Srikakulam": ["Amadalavalasa", "Narasannapeta", "Palakonda", "Rajam", "Srikakulam", "Tekkali"],
        "Visakhapatnam": ["Araku Valley", "Bheemunipatnam", "Narsipatnam", "Paderu", "Visakhapatnam"],
        "Vizianagaram": ["Bobbili", "Parvathipuram", "Srungavarapukota", "Vizianagaram"],
        "West Godavari": ["Bhimavaram", "Eluru", "Jangareddygudem", "Kovvur", "Narsapur", "Palakol", "Tanuku"],
        "YSR Kadapa": ["Badvel", "Jammalamadugu", "Kadapa", "Mydukur", "Proddatur", "Rajampet", "Rayachoti"]
    },
    "Arunachal Pradesh": {
        "East Kameng": ["Seppa"],
        "East Siang": ["Pasighat"],
        "Kurung Kumey": ["Koloriang"],
        "Lohit": ["Tezu"],
        "Papum Pare": ["Itanagar", "Naharlagun"],
        "Tawang": ["Tawang"],
        "Upper Subansiri": ["Daporijo"],
        "West Kameng": ["Bomdila"]
    },
    "Assam": {
        "Barpeta": ["Barpeta", "Barpeta Road", "Chenga", "Sarthebari"],
        "Cachar": ["Silchar", "Sonai", "Udharbond"],
        "Dibrugarh": ["Dibrugarh", "Khowang", "Lahowal", "Moran", "Naharkatia"],
        "Goalpara": ["Goalpara", "Dudhnoi"],
        "Golaghat": ["Golaghat", "Sarupathar"],
        "Jorhat": ["Jorhat", "Majuli", "Titabar"],
        "Kamrup Metropolitan": ["Guwahati"],
        "Kamrup": ["Boko", "Hajo", "Nalbari", "Rangia"],
        "Nagaon": ["Kaliabor", "Nagaon", "Raha"],
        "Sonitpur": ["Biswanath Chariali", "Dhekiajuli", "Gohpur", "Rangapara", "Tezpur"],
        "Tinsukia": ["Digboi", "Doom Dooma", "Margherita", "Tinsukia"]
    },
    "Bihar": {
        "Aurangabad": ["Aurangabad", "Daudnagar", "Goh", "Madanpur", "Nawanagar", "Obra", "Rafiganj"],
        "Bhagalpur": ["Bhagalpur", "Banka", "Kahalgaon", "Nathnagar"],
        "Darbhanga": ["Benipur", "Darbhanga", "Jale", "Singhwara"],
        "Gaya": ["Bodh Gaya", "Gaya", "Manpur", "Sherghati", "Wazirganj"],
        "Muzaffarpur": ["Kanti", "Muzaffarpur", "Sitamarhi"],
        "Nalanda": ["Biharsharif", "Hilsa", "Islampur", "Nalanda", "Rajgir"],
        "Patna": ["Barh", "Danapur", "Masaurhi", "Patna", "Punpun"],
        "Purnia": ["Kasba", "Purnia", "Rupauli"],
        "Vaishali": ["Hajipur", "Lalganj", "Mahnar", "Patepur"]
    },
    "Chhattisgarh": {
        "Bastar": ["Bakawand", "Bastar", "Darbha", "Jagdalpur", "Lohandiguda", "Tokapal"],
        "Bilaspur": ["Akaltara", "Belha", "Bilaspur", "Kota", "Lormi", "Masturi", "Pendra"],
        "Durg": ["Bhilai", "Durg", "Patan", "Sangrampur"],
        "Korba": ["Kartala", "Katghora", "Korba", "Pali", "Poundi Uproda"],
        "Raipur": ["Arang", "Dharsiwa", "Raipur", "Tilda Newra"]
    },
    "Goa": {
        "North Goa": ["Bicholim", "Mapusa", "Panaji", "Ponda", "Satari", "Tiswadi"],
        "South Goa": ["Canacona", "Curchorem", "Margao", "Mormugao", "Quepem", "Sanguem", "Salcete"]
    },
    "Gujarat": {
        "Ahmedabad": ["Ahmedabad City", "Bavla", "Daskroi", "Detroj", "Dholka", "Dhandhuka", "Mandal", "Sanand", "Viramgam"],
        "Amreli": ["Amreli", "Babra", "Bagasara", "Dhari", "Jafrabad", "Khambha", "Lathi", "Lilia", "Rajula", "Savarkundla"],
        "Anand": ["Anand", "Anklav", "Borsad", "Khambhat", "Petlad", "Sojitra", "Tarapur", "Umreth"],
        "Banaskantha": ["Amirgadh", "Bhabhar", "Danta", "Dantiwada", "Deesa", "Dhanera", "Kankrej", "Palanpur", "Radhanpur", "Tharad", "Vadgam", "Vav"],
        "Bharuch": ["Amod", "Ankleshwar", "Bharuch", "Hansot", "Jambusar", "Jhagadia", "Netrang", "Vagra", "Valia"],
        "Bhavnagar": ["Bhavnagar", "Gariadhar", "Ghogha", "Jesar", "Mahuva", "Palitana", "Shihor", "Talaja", "Umrala", "Vallabhipur"],
        "Gandhi Nagar": ["Dehgam", "Gandhi Nagar", "Kalol", "Mansa"],
        "Jamnagar": ["Dhrol", "Jamnagar", "Jodia", "Kalavad", "Khambhalia", "Lalpur", "Wankaner"],
        "Junagadh": ["Junagadh", "Keshod", "Mangrol", "Mendarda", "Talala", "Veraval", "Visavadar"],
        "Kutch": ["Abdasa", "Bhuj", "Lakhpat", "Mandvi", "Mundra", "Nakhatrana", "Rapar"],
        "Rajkot": ["Dhoraji", "Gondal", "Jasdan", "Jetpur", "Kotda Sangani", "Lodhika", "Paddhari", "Rajkot", "Upleta", "Wankaner"],
        "Surat": ["Bardoli", "Chorasi", "Kamrej", "Mandvi", "Mangrol", "Mahuva", "Olpad", "Palsana", "Surat", "Umarpada"],
        "Vadodara": ["Dabhoi", "Karjan", "Padra", "Sankheda", "Savli", "Shinor", "Vaghodiya", "Vadodara"],
        "Valsad": ["Dharampur", "Kaprada", "Navsari", "Pardi", "Umbergaon", "Valsad"]
    },
    "Haryana": {
        "Ambala": ["Ambala", "Barara", "Mullana", "Naraingarh"],
        "Faridabad": ["Ballabhgarh", "Faridabad"],
        "Gurugram": ["Gurugram", "Pataudi", "Sohna"],
        "Hisar": ["Adampur", "Barwala", "Hansi", "Hisar", "Narnaund", "Uklana"],
        "Karnal": ["Assandh", "Gharaunda", "Indri", "Karnal", "Nilokheri"],
        "Kurukshetra": ["Kurukshetra", "Pehowa", "Shahabad", "Thanesar"],
        "Rohtak": ["Kalanaur", "Maham", "Rohtak"],
        "Sonipat": ["Ganaur", "Gohana", "Mundlana", "Sonipat"]
    },
    "Himachal Pradesh": {
        "Bilaspur": ["Bilaspur", "Ghumarwin", "Naina Devi"],
        "Chamba": ["Bharmour", "Chamba", "Dalhousie", "Salooni"],
        "Hamirpur": ["Bhoranj", "Hamirpur", "Sujanpur"],
        "Kangra": ["Dharamshala", "Jogindernagar", "Nurpur", "Palampur"],
        "Kullu": ["Anni", "Banjar", "Kullu", "Manali", "Nirmand"],
        "Mandi": ["Balh", "Bali Chowki", "Chachyot", "Dharampur", "Gohar", "Jogindernagar", "Karsog", "Mandi", "Sadar", "Sundernagar"],
        "Shimla": ["Rampur", "Rohru", "Shimla"],
        "Solan": ["Arki", "Kasauli", "Nalagarh", "Solan"]
    },
    "Jharkhand": {
        "Bokaro": ["Bokaro", "Chas", "Chandankiyari", "Nawadih", "Tenughat"],
        "Dhanbad": ["Baghmara", "Dhanbad", "Nirsa", "Topchanchi"],
        "East Singhbhum": ["Boram", "Dhalbhum", "Ghatsila", "Jamshedpur", "Potka"],
        "Giridih": ["Dumri", "Gandey", "Giridih", "Pirtand", "Tisri"],
        "Hazaribagh": ["Barkagaon", "Barhi", "Chouparan", "Hazaribagh", "Ichak", "Keredari", "Mandu"],
        "Ranchi": ["Angara", "Bundu", "Chanho", "Kanke", "Khunti", "Mandar", "Ormanjhi", "Ranchi", "Sonahatu"]
    },
    "Karnataka": {
        "Bagalkote": ["Bagalkote", "Badami", "Bilgi", "Hungund", "Ilkal", "Jamkhandi", "Mudhol", "Rabkavi Banhatti"],
        "Ballari": ["Ballari", "Hagaribommanahalli", "Harapanahalli", "Hospet", "Kudligi", "Sandur", "Siruguppa"],
        "Belagavi": ["Athani", "Bailhongal", "Belagavi", "Chikodi", "Gokak", "Hukkeri", "Khanapur", "Raibag", "Ramdurg", "Savadatti"],
        "Bengaluru Rural": ["Devanahalli", "Doddaballapura", "Hoskote", "Nelamangala"],
        "Bengaluru Urban": ["Anekal", "Bengaluru East", "Bengaluru North", "Bengaluru South", "Yelahanka"],
        "Bidar": ["Aurad", "Basavakalyan", "Bhalki", "Bidar", "Humnabad"],
        "Chamarajanagara": ["Chamarajanagara", "Gundlupet", "Hanur", "Kollegal", "Yalandur"],
        "Chikkaballapura": ["Bagepalli", "Chikkaballapura", "Chintamani", "Gauribidanur", "Gudibanda", "Sidlaghatta"],
        "Chikkamagaluru": ["Ajjampura", "Birur", "Chikkamagaluru", "Kadur", "Koppa", "Mudigere", "Narasimharajapura", "Sringeri", "Tarikere"],
        "Chitradurga": ["Challakere", "Chitradurga", "Hiriyur", "Holalkere", "Hosadurga", "Molakalmuru"],
        "Dakshina Kannada": ["Bantval", "Belthangady", "Kadaba", "Mangaluru", "Moodbidri", "Puttur", "Sullia", "Ullal"],
        "Davangere": ["Channagiri", "Davanagere", "Harapanahalli", "Honnali", "Jagalur", "Nyamati"],
        "Dharwad": ["Dharwad", "Hubli", "Kalghatgi", "Kundgol", "Navalgund"],
        "Gadag": ["Gadag", "Mundargi", "Nargund", "Ron", "Shirahatti"],
        "Hassan": ["Alur", "Arakalagud", "Arkalgud", "Belur", "Channarayapatna", "Hassan", "Holenarasipur", "Sakleshpur"],
        "Haveri": ["Byadagi", "Hanagal", "Haveri", "Hirekerur", "Ranibennur", "Savanur", "Shiggaon"],
        "Kalaburagi": ["Afzalpur", "Aland", "Chincholi", "Chitapur", "Gurmatkal", "Jevargi", "Kalaburagi", "Sedam"],
        "Kodagu": ["Madikeri", "Somwarpet", "Virajpet"],
        "Kolar": ["Bangarpet", "Kolar", "Malur", "Mulbagal", "Srinivasapura"],
        "Koppal": ["Gangavathi", "Koppal", "Kushtagi", "Yelburga"],
        "Mandya": ["K.R.Pet", "Kirugavalu", "Krishnarajapete", "Maddur", "Malavalli", "Mandya", "Nagamangala", "Pandavapura", "Shrirangapattana"],
        "Mysuru": ["Heggadadevankote", "Hunsur", "K.R.Nagar", "Mysuru", "Nanjangud", "Periyapatna", "T.Narasipur"],
        "Raichur": ["Devadurga", "Lingsugur", "Manvi", "Raichur", "Sindhanur"],
        "Ramanagara": ["Channapatna", "Kanakapura", "Magadi", "Ramanagara"],
        "Shivamogga": ["Bhadravathi", "Hosanagara", "Sagara", "Shikaripura", "Shivamogga", "Tirthahalli"],
        "Tumakuru": ["Chikkanayakanhalli", "Gubbi", "Koratagere", "Kunigal", "Madhugiri", "Pavagada", "Sira", "Tiptur", "Tumakuru", "Turuvekere"],
        "Udupi": ["Byndoor", "Karkala", "Kundapura", "Udupi"],
        "Uttara Kannada": ["Ankola", "Bhatkal", "Dandeli", "Haliyal", "Joida", "Karwar", "Kumta", "Mundgod", "Siddapur", "Sirsi", "Yellapur"],
        "Vijayapura": ["Basavana Bagewadi", "Devar Hippargi", "Indi", "Muddebihal", "Sindagi", "Tikota", "Vijayapura"],
        "Yadgir": ["Gurmatkal", "Shahpur", "Shorapur", "Yadgir"]
    },
    "Kerala": {
        "Alappuzha": ["Ambalappuzha", "Arookutty", "Aryad", "Chengannur", "Cherthala", "Karthikappally", "Kuttanad", "Mavelikkara"],
        "Ernakulam": ["Aluva", "Angamaly", "Fort Kochi", "Kanayannur", "Kothamangalam", "Kunnathunadu", "Muvattupuzha", "North Paravur", "Paravur"],
        "Idukki": ["Devikulam", "Idukki", "Peerumade", "Thodupuzha", "Udumbanchola"],
        "Kannur": ["Iritty", "Kannur", "Taliparamba", "Thalassery"],
        "Kasaragod": ["Hosdurg", "Kasaragod", "Manjeshwara", "Veled"],
        "Kollam": ["Chathannur", "Ittiva", "Karunagappally", "Kollam", "Kottarakkara", "Punalur", "Sasthamkotta"],
        "Kottayam": ["Changanassery", "Erattupetta", "Kanjirappally", "Kottayam", "Meenachil", "Pala", "Vaikom"],
        "Kozhikode": ["Koyilandy", "Kozhikode", "Mukkam", "Thamarassery", "Vadakara"],
        "Malappuram": ["Eranad", "Kondotty", "Mankada", "Nilambur", "Perinthalmanna", "Tirur", "Tirurangadi"],
        "Palakkad": ["Alathur", "Attappady", "Chittur", "Kollengode", "Mannarkkad", "Ottapalam", "Palakkad", "Shoranur", "Thrithala"],
        "Pathanamthitta": ["Adoor", "Kozhencherry", "Mallappally", "Pathanamthitta", "Ranni", "Thiruvalla"],
        "Thiruvananthapuram": ["Chirayinkeezhu", "Kazhakkoottam", "Kattakkada", "Nemom", "Neyyattinkara", "Perumkadavila", "Thiruvananthapuram", "Vamanapuram", "Varkala"],
        "Thrissur": ["Chalakudy", "Chavakkad", "Kodungallur", "Kunnamkulam", "Mukundapuram", "Talappilly", "Thrissur"],
        "Wayanad": ["Kalpetta", "Mananthavady", "Sulthan Bathery"]
    },
    "Madhya Pradesh": {
        "Bhopal": ["Berasia", "Bhopal", "Phanda"],
        "Chhindwara": ["Amarwara", "Chhindwara", "Sausar", "Tamia"],
        "Gwalior": ["Dabra", "Gwalior", "Morar"],
        "Indore": ["Depalpur", "Indore", "Mhow", "Sanwer"],
        "Jabalpur": ["Jabalpur", "Kundam", "Panagar", "Patan"],
        "Katni": ["Bahoriband", "Katni", "Mudwara", "Vijayraghogarh"],
        "Rewa": ["Gangev", "Mauganj", "Rewa", "Semaria", "Teonthar"],
        "Sagar": ["Bina", "Deori", "Kesli", "Rahatgarh", "Sagar"],
        "Ujjain": ["Ghattia", "Mahidpur", "Tarana", "Ujjain"]
    },
    "Maharashtra": {
        "Ahmednagar": ["Ahmednagar", "Akole", "Jamkhed", "Kopargaon", "Nagar", "Nevasa", "Pathardi", "Rahata", "Rahuri", "Sangamner", "Shevgaon", "Shrigonda", "Shrirampur"],
        "Aurangabad": ["Aurangabad", "Gangapur", "Kannad", "Khuldabad", "Paithan", "Phulambri", "Sillod", "Soegaon", "Vaijapur"],
        "Kolhapur": ["Ajra", "Bavda", "Bhudargad", "Chandgad", "Gadhinglaj", "Hatkanangale", "Kagal", "Karvir", "Panhala", "Radhanagari", "Shahuwadi", "Shirol"],
        "Mumbai City": ["Borivali", "Kurla", "Mumbai", "Vikhroli"],
        "Nagpur": ["Bhiwapur", "Hingna", "Katol", "Kuhi", "Nagpur", "Narkhed", "Parseoni", "Ramtek", "Savner", "Umred"],
        "Nashik": ["Baglan", "Chandwad", "Deola", "Dindori", "Igatpuri", "Kalwan", "Malegaon", "Nashik", "Niphad", "Peint", "Sinnar", "Surgana", "Trimbakeshwar", "Yeola"],
        "Pune": ["Ambegaon", "Baramati", "Bhor", "Daund", "Haveli", "Indapur", "Junnar", "Khed", "Maval", "Mulshi", "Pune City", "Purandar", "Shirur", "Velhe"],
        "Satara": ["Jaoli", "Karad", "Khandala", "Khatav", "Koregaon", "Mahabaleshwar", "Man", "Patan", "Satara", "Wai"],
        "Solapur": ["Akkalkot", "Barshi", "Karmala", "Madha", "Malshiras", "Mangalvedhe", "Mohol", "Pandharpur", "Sangola", "Solapur North", "Solapur South"],
        "Thane": ["Ambernath", "Bhiwandi", "Kalyan", "Murbad", "Shahapur", "Thane", "Ulhasnagar"]
    },
    "Manipur": {
        "Bishnupur": ["Bishnupur", "Kumbi", "Moirang", "Nambol"],
        "Imphal East": ["Heingang", "Imphal", "Jiribam", "Keirao"],
        "Imphal West": ["Jiribam", "Lamphel", "Langthabal", "Patsoi"],
        "Thoubal": ["Kakching", "Thoubal", "Wangjing", "Yairipok"]
    },
    "Meghalaya": {
        "East Garo Hills": ["Resubelpara", "Williamnagar"],
        "East Khasi Hills": ["Mairang", "Mawkyrwat", "Mawlai", "Mylliem", "Nongkrem", "Nongstoin", "Shillong", "Sohryngkham"],
        "West Garo Hills": ["Dalu", "Phulbari", "Rongram", "Selsella", "Tikrikilla", "Tura"]
    },
    "Mizoram": {
        "Aizawl": ["Aizawl"],
        "Champhai": ["Champhai"],
        "Lunglei": ["Lunglei"],
        "Saiha": ["Saiha"]
    },
    "Nagaland": {
        "Dimapur": ["Dimapur"],
        "Kohima": ["Kohima", "Phek"],
        "Mokokchung": ["Mokokchung"],
        "Tuensang": ["Tuensang"],
        "Wokha": ["Wokha"]
    },
    "Odisha": {
        "Angul": ["Angul", "Athamallik", "Chhendipada", "Pallahara", "Talcher"],
        "Balasore": ["Balasore", "Basta", "Bhograi", "Jaleswar", "Nilagiri", "Simulia", "Soro"],
        "Bhubaneswar": ["Bhubaneswar", "Jatni"],
        "Cuttack": ["Athagarh", "Banki", "Baramba", "Barang", "Cuttack", "Dompada", "Kendrapara", "Mahanga", "Niali", "Salepur"],
        "Ganjam": ["Aska", "Bhanjanagar", "Berhampur", "Chhatrapur", "Digapahandi", "Hinjili", "Kabisuryanagar", "Kodala", "Phulbani", "Polasara", "Sanakhemundi"],
        "Khordha": ["Begunia", "Bhubaneswar", "Boudh", "Chilika", "Jatni", "Khordha", "Tangi"],
        "Mayurbhanj": ["Baripada", "Karanjia", "Rairangpur", "Udala"],
        "Puri": ["Brahmagiri", "Kakatpur", "Konark", "Nimapada", "Pipili", "Puri", "Satyabadi"]
    },
    "Punjab": {
        "Amritsar": ["Ajnala", "Amritsar", "Attari", "Baba Bakala", "Jandiala Guru", "Majitha"],
        "Bathinda": ["Bathinda", "Goniana", "Maur", "Nathana", "Phul", "Rampura Phul", "Sangat", "Talwandi Sabo"],
        "Jalandhar": ["Jalandhar East", "Jalandhar West", "Nakodar", "Phillaur", "Shahkot"],
        "Ludhiana": ["Dehlon", "Jagraon", "Khanna", "Ludhiana East", "Ludhiana West", "Payal", "Raikot", "Samrala"],
        "Patiala": ["Nabha", "Patran", "Patiala", "Rajpura", "Samana"],
        "Sangrur": ["Dhuri", "Lehra", "Malerkotla", "Moonak", "Sangrur", "Sunam"]
    },
    "Rajasthan": {
        "Ajmer": ["Ajmer", "Beawar", "Kekri", "Kishangarh", "Masuda", "Nasirabad", "Pisangan", "Pushkar", "Roopangarh", "Sarwar"],
        "Alwar": ["Alwar", "Bansur", "Behror", "Kishangarh Bas", "Kotkasim", "Laxmangarh", "Mandawar", "Mundawar", "Rajgarh", "Ramgarh", "Thanagazi", "Tijara"],
        "Barmer": ["Barmer", "Balotra", "Baytu", "Chohtan", "Dhorimanna", "Gadra Road", "Gudamalani", "Pachpadra", "Samdari", "Sheo", "Siwana"],
        "Bikaner": ["Bikaner", "Chhatargarh", "Dungargarh", "Khajuwala", "Kolayat", "Lunkaransar", "Nokha", "Poogal"],
        "Jaipur": ["Amber", "Bassi", "Chaksu", "Chomu", "Dudu", "Jamwa Ramgarh", "Jhotwara", "Jaipur", "Kotputli", "Phagi", "Sanganer", "Shahpura", "Viratnagar"],
        "Jodhpur": ["Balesar", "Bhopalgarh", "Bilara", "Jodhpur", "Luni", "Mandore", "Osian", "Phalodi", "Setrawa", "Shergarh"],
        "Kota": ["Itawa", "Kota", "Ladpura", "Ramganj Mandi", "Sangod"],
        "Udaipur": ["Badgaon", "Bhinder", "Gogunda", "Kherwara", "Kotra", "Lasadia", "Mavli", "Salumbar", "Sarada", "Udaipur", "Vallabhnagar"]
    },
    "Sikkim": {
        "East Sikkim": ["Gangtok", "Pakyong", "Rongli", "Rungpo"],
        "North Sikkim": ["Chungthang", "Mangan"],
        "South Sikkim": ["Jorethang", "Namchi", "Ravangla"],
        "West Sikkim": ["Gyalshing", "Soreng"]
    },
    "Tamil Nadu": {
        "Ariyalur": ["Ariyalur", "Jayankondam", "Sendurai", "T.Palur", "Udayarpalayam"],
        "Chengalpattu": ["Cheyyur", "Chengalpattu", "Madurantakam", "Thirukalukundram", "Uthiramerur"],
        "Chennai": ["Alandur", "Ambattur", "Anna Nagar", "Egmore", "Kodambakkam", "Mylapore", "Perambur", "Sholinganallur", "Tambaram", "Thiruvottiyur", "Tondiarpet"],
        "Coimbatore": ["Coimbatore North", "Coimbatore South", "Mettupalayam", "Palladam", "Pollachi", "Sulur", "Valparai"],
        "Cuddalore": ["Chidambaram", "Cuddalore", "Kattumannarkoil", "Panruti", "Srimushnam", "Virudhachalam"],
        "Dharmapuri": ["Dharmapuri", "Harur", "Palacode", "Pennagaram"],
        "Dindigul": ["Attur", "Dindigul", "Natham", "Nilakottai", "Oddanchatram", "Palani", "Vedasandur"],
        "Erode": ["Bhavani", "Erode", "Gobichettipalayam", "Kavundampalayam", "Kodumudi", "Perundurai", "Sathyamangalam"],
        "Kallakurichi": ["Chinnasalem", "Kallakurichi", "Kanai", "Tirukoilur", "Ulundurpet"],
        "Kancheepuram": ["Kancheepuram", "Kundrathur", "Sriperumbudur", "Uthiramerur", "Walajabad"],
        "Kanyakumari": ["Agastheeswaram", "Kalkulam", "Thovalai", "Vilavancode"],
        "Karur": ["Aravakurichi", "Karur", "Krishnarayapuram", "Kulithalai", "Manmangalam"],
        "Krishnagiri": ["Bargur", "Denkanikotta", "Hosur", "Krishnagiri", "Pochampalli", "Uthangarai"],
        "Madurai": ["Madurai North", "Madurai South", "Melur", "Peraiyur", "Thirumangalam", "Usilampatti", "Vadipatti"],
        "Nagapattinam": ["Keelaiyur", "Kilvelur", "Mayiladuthurai", "Nagapattinam", "Sirkazhi", "Tharangambadi", "Vedaranyam"],
        "Namakkal": ["Kumarapalayam", "Namakkal", "Paramathi-Velur", "Rasipuram", "Tiruchengode"],
        "Nilgiris": ["Coonoor", "Gudalur", "Kotagiri", "Ooty"],
        "Perambalur": ["Ariyalur", "Perambalur", "Veppanthattai"],
        "Pudukkottai": ["Alangudi", "Aranthangi", "Gandarvakottai", "Illupur", "Karambakkudi", "Manamelkudi", "Ponamaravathi", "Pudukkottai", "Thiruvarankulam", "Tirumayam"],
        "Ramanathapuram": ["Kadaladi", "Kamuthi", "Mudukulathur", "Paramakudi", "Ramanathapuram", "Rameswaram", "Tiruvadanai"],
        "Ranipet": ["Arcot", "Arakkonam", "Nemili", "Ranipet", "Sholinghur", "Walajapet"],
        "Salem": ["Attur", "Edapadi", "Mettur", "Omalur", "Salem", "Sankari", "Yercaud"],
        "Sivaganga": ["Devakottai", "Ilayangudi", "Kalaiyarkoil", "Karaikudi", "Manamadurai", "Sivaganga", "Tiruppuvanam"],
        "Tenkasi": ["Alangulam", "Kadayanallur", "Sankarankovil", "Shencottai", "Tenkasi", "Vasudevanallur"],
        "Thanjavur": ["Kumbakonam", "Orathanadu", "Papanasam", "Pattukkottai", "Peravurani", "Thiruvaiyaru", "Thanjavur"],
        "Theni": ["Andipatti", "Bodinayakkanur", "Periyakulam", "Uthamapalayam", "Theni"],
        "Thoothukudi": ["Kovilpatti", "Ottapidaram", "Sathankulam", "Srivaikundam", "Tiruchendur", "Thoothukudi", "Vilathikulam"],
        "Tiruchirappalli": ["Lalgudi", "Manachanallur", "Manapparai", "Musiri", "Srirangam", "Thottiyam", "Tiruverumbur", "Tiruchirappalli"],
        "Tirunelveli": ["Ambasamudram", "Cheranmahadevi", "Nanguneri", "Palayamkottai", "Tirunelveli"],
        "Tirupathur": ["Ambur", "Natrampalli", "Tirupathur", "Vaniyambadi"],
        "Tiruppur": ["Avinashi", "Dharapuram", "Kangeyam", "Madathukulam", "Palladam", "Tiruppur", "Udumalaipettai", "Uthukuli"],
        "Tiruvallur": ["Avadi", "Gummidipoondi", "Minjur", "Ponneri", "Poonamallee", "Tiruvallur", "Tiruttani"],
        "Tiruvannamalai": ["Arni", "Cheyyar", "Chengam", "Chetpet", "Jawadhu Hills", "Tiruvannamalai", "Vandavasi"],
        "Tiruvarur": ["Kodavasal", "Mannargudi", "Nannilam", "Thiruvarur", "Valangaiman"],
        "Vellore": ["Anaicut", "Gudiyatham", "Katpadi", "Tirupattur", "Vellore"],
        "Villupuram": ["Gingee", "Kallakurichi", "Sankarapuram", "Tirukoilur", "Ulundurpet", "Villupuram"],
        "Virudhunagar": ["Aruppukkottai", "Rajapalayam", "Sivakasi", "Srivilliputhur", "Virudhunagar", "Watrap"]
    },
    "Telangana": {
        "Adilabad": ["Adilabad", "Asifabad", "Bela", "Boath", "Gudihathnoor", "Ichoda", "Jainath", "Kotapalli", "Mavala", "Narnoor", "Tamsi", "Utnoor"],
        "Bhadradri Kothagudem": ["Bhadrachalam", "Charla", "Cherla", "Dammapet", "Julurpad", "Kothagudem", "Palvancha", "Pinapaka", "Sujathanagar", "Yellandu"],
        "Hyderabad": ["Bahadurpura", "Bandlaguda Jagir", "Hayathnagar", "Kapra", "Kukatpally", "Rajendranagar", "Secunderabad", "Shaikpet"],
        "Karimnagar": ["Choppadandi", "Huzurabad", "Jammikunta", "Karimnagar", "Koratla", "Manthani", "Metpalle", "Sircilla"],
        "Khammam": ["Enkoor", "Kallur", "Khammam", "Kothagudem", "Kusumanchi", "Madhira", "Mudigonda", "Nelakondapalle", "Penuballi", "Tirumalayapalem"],
        "Mahbubnagar": ["Achampet", "Addakal", "Amangal", "Balanagar", "Bijinapalle", "Gadwal", "Kalwakurthy", "Kodangal", "Kosgi", "Lingal", "Mahabubnagar", "Makthal", "Narayanpet", "Shadnagar", "Utkoor"],
        "Medak": ["Jogipet", "Kohir", "Medak", "Narayankhed", "Narsapur", "Siddipet", "Toopran"],
        "Nalgonda": ["Alair", "Bhuvanagiri", "Choutuppal", "Devarakonda", "Huzurnagar", "Kodad", "Miryalaguda", "Nalgonda", "Nakrekal", "Suryapet"],
        "Nizamabad": ["Armoor", "Balkonda", "Bheemgal", "Bodhan", "Dichpally", "Nizamabad", "Varni"],
        "Rangareddy": ["Chevella", "Farooqnagar", "Gandipet", "Hayathnagar", "Ibrahimpatnam", "Kandukur", "Maheshwaram", "Marpalle", "Rajendranagar", "Shamshabad", "Tandur"],
        "Warangal": ["Cherial", "Duggondi", "Ghanpur", "Hasanparthy", "Narsampet", "Parkal", "Rayaparthi", "Station Ghanpur", "Warangal", "Wardannapet"]
    },
    "Tripura": {
        "Dhalai": ["Ambassa", "Gandacherra", "Kamalpur", "Longtharai Valley"],
        "Gomati": ["Amarpur", "Karbook", "Udaipur"],
        "South Tripura": ["Belonia", "Santirbazar", "Satchand"],
        "West Tripura": ["Agartala", "Bishalgarh", "Jirania", "Mohanpur"]
    },
    "Uttar Pradesh": {
        "Agra": ["Agra", "Bah", "Etmadpur", "Fatehabad", "Farah", "Kheragarh", "Kiraoli"],
        "Aligarh": ["Aligarh", "Atrauli", "Bijauli", "Gangiri", "Gabhana", "Iglas", "Jawan"],
        "Allahabad (Prayagraj)": ["Allahabad", "Bara", "Chaka", "Phulpur", "Shankargarh", "Soraon"],
        "Bareilly": ["Aonla", "Baheri", "Bareilly", "Bhojipura", "Faridpur", "Meerganj", "Nawabganj"],
        "Gorakhpur": ["Bansgaon", "Bhathat", "Campierganj", "Chauri-Chaura", "Chargawan", "Gola", "Gorakhpur", "Pipraich"],
        "Kanpur Nagar": ["Bilhaur", "Ghatampur", "Kanpur", "Maharajpur"],
        "Lucknow": ["Bakshi Ka Talab", "Chinhat", "Lucknow", "Malihabad", "Mohanlalganj", "Sarojini Nagar"],
        "Mathura": ["Baldeo", "Chhata", "Govardhan", "Mathura", "Mant", "Nandgaon", "Vrindavan"],
        "Meerut": ["Hapur", "Kithore", "Mawana", "Meerut", "Modinagar", "Rajabpur", "Sardhana"],
        "Varanasi": ["Arariya", "Badagaon", "Cholapur", "Kashi Vidyapeeth", "Pindra", "Rajatalab", "Varanasi"]
    },
    "Uttarakhand": {
        "Almora": ["Almora", "Bhikiyasain", "Dhauladevi", "Dwarahat", "Hawalbag", "Lamgara", "Ranikhet", "Salt"],
        "Dehradun": ["Chakrata", "Dehradun", "Doiwala", "Raipur", "Rishikesh", "Vikasnagar"],
        "Haridwar": ["Bhagwanpur", "Haridwar", "Laksar", "Narsan", "Roorkee"],
        "Nainital": ["Betalghat", "Bhimtal", "Haldwani", "Nainital", "Ramnagar"],
        "Pauri Garhwal": ["Dugadda", "Ekeshwar", "Khirsu", "Lansdowne", "Pauri", "Pabau", "Yamkeshwar"],
        "Tehri Garhwal": ["Chamba", "Devaprayag", "Dhanolti", "Ghansali", "Jakhnidhar", "Pratapnagar", "Tehri"],
        "Udham Singh Nagar": ["Bazpur", "Gadarpur", "Jaspur", "Kashipur", "Khatima", "Kichha", "Rudrapur", "Sitarganj"]
    },
    "West Bengal": {
        "Bankura": ["Bankura", "Bishnupur", "Chhatna", "Indpur", "Khatra", "Kotulpur", "Onda", "Patrasaer", "Raipur", "Saltora", "Sonamukhi", "Taldangra"],
        "Birbhum": ["Bolpur", "Dubrajpur", "Ilambazar", "Khoyrasol", "Labpur", "Mayureswar", "Mohammad Bazar", "Murarai", "Nalhati", "Rampurhat", "Sainthia", "Suri"],
        "Darjeeling": ["Darjeeling", "Jorebunglow", "Kalimpong", "Kurseong", "Mirik"],
        "Hooghly": ["Arambag", "Balagarh", "Chanditala", "Dhaniakhali", "Goghat", "Haripal", "Jangipara", "Khanakul", "Pandua", "Polba-Dadpur", "Pursurah", "Serampore", "Singur", "Uttarpara"],
        "Howrah": ["Amta", "Bagnan", "Bally", "Domjur", "Jagatballavpur", "Panchla", "Sankrail", "Shyampur", "Uluberia"],
        "Kolkata": ["Kolkata North", "Kolkata South", "Kolkata West"],
        "Malda": ["Bamangola", "English Bazar", "Gazole", "Habibpur", "Kaliachak", "Manikchak", "Motihari", "Old Malda", "Ratua"],
        "Murshidabad": ["Beldanga", "Bharatpur", "Domkal", "Hariharpara", "Islampur", "Jalangi", "Jiaganj", "Kandi", "Khargram", "Lalgola", "Murshidabad", "Nabagram", "Raghunathganj", "Suti"],
        "Nadia": ["Chakdah", "Chapra", "Haringhata", "Karimpur", "Krishnanagar", "Nakashipara", "Ranaghat", "Santipur", "Tehatta"],
        "North 24 Parganas": ["Amdanga", "Baranagar", "Barasat", "Basirhat", "Bongaon", "Deganga", "Gaighata", "Habra", "Haroa", "Minakhan", "Rajarhat", "Sandeshkhali", "Swarupnagar"],
        "Purba Medinipur": ["Bhagabanpur", "Chandipur", "Contai", "Deshopran", "Egra", "Haldia", "Khejuri", "Mahishadal", "Nandakumar", "Panskura", "Ramnagar", "Tamluk"],
        "South 24 Parganas": ["Baruipur", "Bishnupur", "Budge Budge", "Canning", "Diamond Harbour", "Gosaba", "Jaynagar", "Joynagar", "Kulpi", "Mathurapur", "Mograhat", "Sagar"]
    },
    "Andaman and Nicobar Islands": {
        "Nicobar": ["Car Nicobar"],
        "North and Middle Andaman": ["Diglipur", "Mayabunder"],
        "South Andaman": ["Port Blair", "Rangat"]
    },
    "Chandigarh": {
        "Chandigarh": ["Chandigarh"]
    },
    "Dadra and Nagar Haveli and Daman and Diu": {
        "Dadra and Nagar Haveli": ["Silvassa"],
        "Daman": ["Daman"],
        "Diu": ["Diu"]
    },
    "Delhi": {
        "Central Delhi": ["Central Delhi"],
        "East Delhi": ["East Delhi"],
        "New Delhi": ["New Delhi"],
        "North Delhi": ["North Delhi"],
        "North East Delhi": ["North East Delhi"],
        "North West Delhi": ["North West Delhi"],
        "Shahdara": ["Shahdara"],
        "South Delhi": ["South Delhi"],
        "South East Delhi": ["South East Delhi"],
        "South West Delhi": ["South West Delhi"],
        "West Delhi": ["West Delhi"]
    },
    "Jammu and Kashmir": {
        "Anantnag": ["Anantnag", "Bijbehara", "Dooru", "Pahalgam", "Shangus"],
        "Baramulla": ["Baramulla", "Boniyar", "Gulmarg", "Pattan", "Sopore"],
        "Jammu": ["Akhnoor", "Bishnah", "Jammu", "Nagrota", "R.S.Pura", "Suchetgarh"],
        "Kathua": ["Basohli", "Billawar", "Bani", "Hiranagar", "Kathua"],
        "Kulgam": ["D.H.Pora", "Kulgam", "Noorabad", "Pahloo"],
        "Kupwara": ["Handwara", "Karnah", "Kupwara", "Lolab", "Sogam"],
        "Pulwama": ["Awantipora", "Pampore", "Pulwama", "Tral"],
        "Srinagar": ["Chandhara", "Khonmoh", "Pantha Chowk", "Shalteng", "Srinagar"]
    },
    "Ladakh": {
        "Kargil": ["Kargil", "Shakar Chiktan", "Zanskar"],
        "Leh": ["Leh", "Nubra", "Nyoma"]
    },
    "Lakshadweep": {
        "Lakshadweep": ["Kavaratti"]
    },
    "Puducherry": {
        "Karaikal": ["Karaikal"],
        "Mahe": ["Mahe"],
        "Puducherry": ["Nettapakkam", "Oulgaret", "Puducherry", "Villianur"],
        "Yanam": ["Yanam"]
    }
}


def get_states():
    return sorted(LOCATIONS.keys())


def get_districts(state: str):
    state_data = LOCATIONS.get(state, {})
    return sorted(state_data.keys())


def get_taluks(state: str, district: str):
    state_data = LOCATIONS.get(state, {})
    return sorted(state_data.get(district, []))
