/* ============================================================
   Dynasty HQ — FBS teams & conferences (real names)
   Editable: prestige (1-5) and colors are approximate.
   A parody-name layer (USE_PARODY) lets us swap to original
   names later by flipping ONE flag — no gameplay impact.
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  // n=name, m=mascot, ab=abbr, c=conference, p=prestige(1-5), c1/c2=colors, city, st=state
  const T = (n,m,ab,c,p,c1,c2,city,st) => ({ id:ab.toLowerCase(), n, m, ab, c, p, c1, c2, city, st });

  const TEAMS = [
    // ---- SEC ----
    T("Alabama","Crimson Tide","ALA","SEC",5,"#9E1B32","#828A8F","Tuscaloosa","AL"),
    T("Arkansas","Razorbacks","ARK","SEC",3,"#9D2235","#FFFFFF","Fayetteville","AR"),
    T("Auburn","Tigers","AUB","SEC",4,"#0C2340","#E87722","Auburn","AL"),
    T("Florida","Gators","FLA","SEC",4,"#0021A5","#FA4616","Gainesville","FL"),
    T("Georgia","Bulldogs","UGA","SEC",5,"#BA0C2F","#000000","Athens","GA"),
    T("Kentucky","Wildcats","UK","SEC",3,"#0033A0","#FFFFFF","Lexington","KY"),
    T("LSU","Tigers","LSU","SEC",5,"#461D7C","#FDD023","Baton Rouge","LA"),
    T("Mississippi State","Bulldogs","MSST","SEC",3,"#660000","#FFFFFF","Starkville","MS"),
    T("Missouri","Tigers","MIZ","SEC",4,"#F1B82D","#000000","Columbia","MO"),
    T("Oklahoma","Sooners","OU","SEC",5,"#841617","#FDF9D8","Norman","OK"),
    T("Ole Miss","Rebels","MISS","SEC",4,"#14213D","#CE1126","Oxford","MS"),
    T("South Carolina","Gamecocks","SC","SEC",3,"#73000A","#000000","Columbia","SC"),
    T("Tennessee","Volunteers","TENN","SEC",4,"#FF8200","#FFFFFF","Knoxville","TN"),
    T("Texas","Longhorns","TEX","SEC",5,"#BF5700","#FFFFFF","Austin","TX"),
    T("Texas A&M","Aggies","TAMU","SEC",4,"#500000","#FFFFFF","College Station","TX"),
    T("Vanderbilt","Commodores","VAN","SEC",2,"#866D4B","#000000","Nashville","TN"),

    // ---- Big Ten ----
    T("Illinois","Fighting Illini","ILL","B1G",3,"#13294B","#E84A27","Champaign","IL"),
    T("Indiana","Hoosiers","IND","B1G",3,"#990000","#FFFFFF","Bloomington","IN"),
    T("Iowa","Hawkeyes","IOWA","B1G",4,"#000000","#FFCD00","Iowa City","IA"),
    T("Maryland","Terrapins","MD","B1G",3,"#E03A3E","#FFD520","College Park","MD"),
    T("Michigan","Wolverines","MICH","B1G",5,"#00274C","#FFCB05","Ann Arbor","MI"),
    T("Michigan State","Spartans","MSU","B1G",3,"#18453B","#FFFFFF","East Lansing","MI"),
    T("Minnesota","Golden Gophers","MINN","B1G",3,"#7A0019","#FFCC33","Minneapolis","MN"),
    T("Nebraska","Cornhuskers","NEB","B1G",4,"#E41C38","#FFFFFF","Lincoln","NE"),
    T("Northwestern","Wildcats","NW","B1G",2,"#4E2A84","#FFFFFF","Evanston","IL"),
    T("Ohio State","Buckeyes","OSU","B1G",5,"#BB0000","#666666","Columbus","OH"),
    T("Oregon","Ducks","ORE","B1G",5,"#154733","#FEE123","Eugene","OR"),
    T("Penn State","Nittany Lions","PSU","B1G",5,"#041E42","#FFFFFF","University Park","PA"),
    T("Purdue","Boilermakers","PUR","B1G",2,"#CEB888","#000000","West Lafayette","IN"),
    T("Rutgers","Scarlet Knights","RUT","B1G",2,"#CC0033","#FFFFFF","Piscataway","NJ"),
    T("UCLA","Bruins","UCLA","B1G",3,"#2D68C4","#F2A900","Los Angeles","CA"),
    T("USC","Trojans","USC","B1G",5,"#990000","#FFCC00","Los Angeles","CA"),
    T("Washington","Huskies","WASH","B1G",4,"#4B2E83","#B7A57A","Seattle","WA"),
    T("Wisconsin","Badgers","WIS","B1G",4,"#C5050C","#FFFFFF","Madison","WI"),

    // ---- Big 12 ----
    T("Arizona","Wildcats","ARIZ","B12",3,"#003366","#CC0033","Tucson","AZ"),
    T("Arizona State","Sun Devils","ASU","B12",3,"#8C1D40","#FFC627","Tempe","AZ"),
    T("Baylor","Bears","BAY","B12",3,"#154734","#FFB81C","Waco","TX"),
    T("BYU","Cougars","BYU","B12",3,"#002E5D","#FFFFFF","Provo","UT"),
    T("Cincinnati","Bearcats","CIN","B12",3,"#E00122","#000000","Cincinnati","OH"),
    T("Colorado","Buffaloes","COLO","B12",3,"#CFB87C","#000000","Boulder","CO"),
    T("Houston","Cougars","HOU","B12",3,"#C8102E","#FFFFFF","Houston","TX"),
    T("Iowa State","Cyclones","ISU","B12",3,"#C8102E","#F1BE48","Ames","IA"),
    T("Kansas","Jayhawks","KU","B12",3,"#0051BA","#E8000D","Lawrence","KS"),
    T("Kansas State","Wildcats","KSU","B12",4,"#512888","#FFFFFF","Manhattan","KS"),
    T("Oklahoma State","Cowboys","OKST","B12",4,"#FF7300","#000000","Stillwater","OK"),
    T("TCU","Horned Frogs","TCU","B12",4,"#4D1979","#FFFFFF","Fort Worth","TX"),
    T("Texas Tech","Red Raiders","TTU","B12",3,"#CC0000","#000000","Lubbock","TX"),
    T("UCF","Knights","UCF","B12",3,"#000000","#BA9B37","Orlando","FL"),
    T("Utah","Utes","UTAH","B12",4,"#CC0000","#FFFFFF","Salt Lake City","UT"),
    T("West Virginia","Mountaineers","WVU","B12",3,"#002855","#EAAA00","Morgantown","WV"),

    // ---- ACC ----
    T("Boston College","Eagles","BC","ACC",2,"#98002E","#BC9B6A","Chestnut Hill","MA"),
    T("California","Golden Bears","CAL","ACC",2,"#003262","#FDB515","Berkeley","CA"),
    T("Clemson","Tigers","CLEM","ACC",5,"#F56600","#522D80","Clemson","SC"),
    T("Duke","Blue Devils","DUKE","ACC",2,"#003087","#FFFFFF","Durham","NC"),
    T("Florida State","Seminoles","FSU","ACC",4,"#782F40","#CEB888","Tallahassee","FL"),
    T("Georgia Tech","Yellow Jackets","GT","ACC",3,"#B3A369","#003057","Atlanta","GA"),
    T("Louisville","Cardinals","LOU","ACC",3,"#AD0000","#000000","Louisville","KY"),
    T("Miami","Hurricanes","MIA","ACC",4,"#F47321","#005030","Coral Gables","FL"),
    T("NC State","Wolfpack","NCST","ACC",3,"#CC0000","#000000","Raleigh","NC"),
    T("North Carolina","Tar Heels","UNC","ACC",3,"#7BAFD4","#FFFFFF","Chapel Hill","NC"),
    T("Pittsburgh","Panthers","PITT","ACC",3,"#003594","#FFB81C","Pittsburgh","PA"),
    T("SMU","Mustangs","SMU","ACC",3,"#0033A0","#C8102E","Dallas","TX"),
    T("Stanford","Cardinal","STAN","ACC",2,"#8C1515","#FFFFFF","Stanford","CA"),
    T("Syracuse","Orange","SYR","ACC",2,"#F76900","#0B233F","Syracuse","NY"),
    T("Virginia","Cavaliers","UVA","ACC",2,"#232D4B","#F84C1E","Charlottesville","VA"),
    T("Virginia Tech","Hokies","VT","ACC",3,"#630031","#CF4420","Blacksburg","VA"),
    T("Wake Forest","Demon Deacons","WAKE","ACC",2,"#9E7E38","#000000","Winston-Salem","NC"),

    // ---- Pac-12 (rebuilding) ----
    T("Oregon State","Beavers","ORST","PAC",3,"#DC4405","#000000","Corvallis","OR"),
    T("Washington State","Cougars","WSU","PAC",3,"#981E32","#5E6A71","Pullman","WA"),

    // ---- American (AAC) ----
    T("Army","Black Knights","ARMY","AAC",3,"#000000","#D4BF91","West Point","NY"),
    T("Charlotte","49ers","CLT","AAC",1,"#046A38","#FFFFFF","Charlotte","NC"),
    T("East Carolina","Pirates","ECU","AAC",2,"#592A8A","#FFC72C","Greenville","NC"),
    T("Florida Atlantic","Owls","FAU","AAC",2,"#003366","#CC0000","Boca Raton","FL"),
    T("Memphis","Tigers","MEM","AAC",3,"#003087","#898D8D","Memphis","TN"),
    T("Navy","Midshipmen","NAVY","AAC",3,"#00205B","#C5B783","Annapolis","MD"),
    T("North Texas","Mean Green","UNT","AAC",2,"#00853E","#FFFFFF","Denton","TX"),
    T("Rice","Owls","RICE","AAC",1,"#00205B","#C1C6C8","Houston","TX"),
    T("South Florida","Bulls","USF","AAC",2,"#006747","#CFC493","Tampa","FL"),
    T("Temple","Owls","TEM","AAC",1,"#9D2235","#FFFFFF","Philadelphia","PA"),
    T("Tulane","Green Wave","TULN","AAC",3,"#006747","#418FDE","New Orleans","LA"),
    T("Tulsa","Golden Hurricane","TLSA","AAC",1,"#002D72","#C5B783","Tulsa","OK"),
    T("UAB","Blazers","UAB","AAC",2,"#1E6B52","#F4C300","Birmingham","AL"),
    T("UTSA","Roadrunners","UTSA","AAC",2,"#0C2340","#F15A22","San Antonio","TX"),

    // ---- Mountain West ----
    T("Air Force","Falcons","AF","MWC",2,"#003087","#8A8D8F","Colorado Springs","CO"),
    T("Boise State","Broncos","BSU","MWC",3,"#0033A0","#D64309","Boise","ID"),
    T("Colorado State","Rams","CSU","MWC",2,"#1E4D2B","#C8C372","Fort Collins","CO"),
    T("Fresno State","Bulldogs","FRES","MWC",2,"#DB0032","#002E6D","Fresno","CA"),
    T("Hawaii","Rainbow Warriors","HAW","MWC",1,"#024731","#FFFFFF","Honolulu","HI"),
    T("Nevada","Wolf Pack","NEV","MWC",1,"#003366","#807F84","Reno","NV"),
    T("New Mexico","Lobos","UNM","MWC",1,"#BA0C2F","#A7A8AA","Albuquerque","NM"),
    T("San Diego State","Aztecs","SDSU","MWC",2,"#A6192E","#000000","San Diego","CA"),
    T("San Jose State","Spartans","SJSU","MWC",1,"#0055A2","#E5A823","San Jose","CA"),
    T("UNLV","Rebels","UNLV","MWC",2,"#CF0A2C","#666666","Las Vegas","NV"),
    T("Utah State","Aggies","USU","MWC",2,"#0F2439","#8A8D8F","Logan","UT"),
    T("Wyoming","Cowboys","WYO","MWC",2,"#492F24","#FFC425","Laramie","WY"),

    // ---- Sun Belt ----
    T("Appalachian State","Mountaineers","APP","SBC",2,"#000000","#FFCC00","Boone","NC"),
    T("Arkansas State","Red Wolves","ARST","SBC",1,"#CC092F","#000000","Jonesboro","AR"),
    T("Coastal Carolina","Chanticleers","CCU","SBC",2,"#006F71","#A27752","Conway","SC"),
    T("Georgia Southern","Eagles","GASO","SBC",1,"#011E41","#87714D","Statesboro","GA"),
    T("Georgia State","Panthers","GAST","SBC",1,"#0039A6","#CC0000","Atlanta","GA"),
    T("James Madison","Dukes","JMU","SBC",3,"#450084","#CBB677","Harrisonburg","VA"),
    T("Louisiana","Ragin' Cajuns","UL","SBC",2,"#CE181E","#000000","Lafayette","LA"),
    T("UL Monroe","Warhawks","ULM","SBC",1,"#840029","#FFB300","Monroe","LA"),
    T("Marshall","Thundering Herd","MRSH","SBC",2,"#00B140","#000000","Huntington","WV"),
    T("Old Dominion","Monarchs","ODU","SBC",1,"#003057","#7C878E","Norfolk","VA"),
    T("South Alabama","Jaguars","USA","SBC",1,"#00205B","#BF0D3E","Mobile","AL"),
    T("Southern Miss","Golden Eagles","USM","SBC",1,"#000000","#FFAA3C","Hattiesburg","MS"),
    T("Texas State","Bobcats","TXST","SBC",2,"#501214","#8F7C4F","San Marcos","TX"),
    T("Troy","Trojans","TROY","SBC",2,"#8A2432","#8A8D8F","Troy","AL"),

    // ---- MAC ----
    T("Akron","Zips","AKR","MAC",1,"#00285E","#84754E","Akron","OH"),
    T("Ball State","Cardinals","BALL","MAC",1,"#BA0C2F","#FFFFFF","Muncie","IN"),
    T("Bowling Green","Falcons","BG","MAC",1,"#FE5000","#4F2C1D","Bowling Green","OH"),
    T("Buffalo","Bulls","BUFF","MAC",1,"#005BBB","#000000","Buffalo","NY"),
    T("Central Michigan","Chippewas","CMU","MAC",1,"#6A0032","#FFC82E","Mount Pleasant","MI"),
    T("Eastern Michigan","Eagles","EMU","MAC",1,"#046A38","#FFFFFF","Ypsilanti","MI"),
    T("Kent State","Golden Flashes","KENT","MAC",1,"#002664","#EAAB00","Kent","OH"),
    T("Miami (OH)","RedHawks","M-OH","MAC",2,"#B61E2E","#FFFFFF","Oxford","OH"),
    T("Northern Illinois","Huskies","NIU","MAC",2,"#BA0C2F","#000000","DeKalb","IL"),
    T("Ohio","Bobcats","OHIO","MAC",2,"#00694E","#FFFFFF","Athens","OH"),
    T("Toledo","Rockets","TOL","MAC",2,"#15397F","#FFC72C","Toledo","OH"),
    T("Western Michigan","Broncos","WMU","MAC",1,"#5C3317","#A79068","Kalamazoo","MI"),
    T("UMass","Minutemen","UMASS","MAC",1,"#881C1C","#FFFFFF","Amherst","MA"),

    // ---- Conference USA ----
    T("FIU","Panthers","FIU","CUSA",1,"#081E3F","#B6862C","Miami","FL"),
    T("Jacksonville State","Gamecocks","JVST","CUSA",1,"#CC0000","#000000","Jacksonville","AL"),
    T("Kennesaw State","Owls","KENN","CUSA",1,"#000000","#FDBB30","Kennesaw","GA"),
    T("Liberty","Flames","LIB","CUSA",3,"#002D62","#A6192E","Lynchburg","VA"),
    T("Louisiana Tech","Bulldogs","LT","CUSA",1,"#002F8B","#E31B23","Ruston","LA"),
    T("Middle Tennessee","Blue Raiders","MTSU","CUSA",1,"#0066CC","#000000","Murfreesboro","TN"),
    T("New Mexico State","Aggies","NMSU","CUSA",1,"#891216","#FFFFFF","Las Cruces","NM"),
    T("Sam Houston","Bearkats","SHSU","CUSA",1,"#F47920","#003B5C","Huntsville","TX"),
    T("UTEP","Miners","UTEP","CUSA",1,"#FF8200","#041E42","El Paso","TX"),
    T("Western Kentucky","Hilltoppers","WKU","CUSA",2,"#C8102E","#000000","Bowling Green","KY"),

    // ---- Independents ----
    T("Notre Dame","Fighting Irish","ND","IND",5,"#0C2340","#C99700","Notre Dame","IN"),
    T("UConn","Huskies","CONN","IND",1,"#000E2F","#FFFFFF","Storrs","CT"),
  ];

  const CONFS = {
    SEC:"SEC", B1G:"Big Ten", B12:"Big 12", ACC:"ACC", PAC:"Pac-12",
    AAC:"American", MWC:"Mountain West", SBC:"Sun Belt", MAC:"MAC", CUSA:"Conference USA", IND:"Independent"
  };
  const CONF_ORDER = ["SEC","B1G","B12","ACC","PAC","AAC","MWC","SBC","MAC","CUSA","IND"];

  // ---- Parody layer ----
  // When USE_PARODY is true, displayName(team) returns an original (non-real) name.
  // Deterministic so a given school always maps to the same parody identity.
  DHQ.USE_PARODY = false;
  const P_NICK = ["Pioneers","Sentinels","Outlaws","Storm","Vanguard","Ironmen","Comets","Mavericks",
    "Privateers","Wolves","Royals","Titans","Miners","Stallions","Aviators","Crusaders","Dukes","Rangers"];
  function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; } return h; }
  function parodyName(team){
    const h = hash(team.id);
    const nick = P_NICK[h % P_NICK.length];
    return { name: `${team.city}`, nick, full: `${team.city} ${nick}` };
  }
  function displayName(team){ return DHQ.USE_PARODY ? parodyName(team).name : team.n; }
  function displayNick(team){ return DHQ.USE_PARODY ? parodyName(team).nick : team.m; }
  function displayFull(team){ return DHQ.USE_PARODY ? parodyName(team).full : `${team.n} ${team.m}`; }

  const byId = (id) => TEAMS.find(t => t.id === id) || null;
  const byConf = (c) => TEAMS.filter(t => t.c === c);

  DHQ.teams = {
    TEAMS, CONFS, CONF_ORDER,
    byId, byConf, parodyName, displayName, displayNick, displayFull
  };
})();
