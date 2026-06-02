let otomasyonVerisi = JSON.parse(localStorage.getItem("hospital_catering_enterprise_v5.5")) || [];

let seciliPersonelId = null;
let seciliGun = null;
let mevcutYil = 2026;
let mevcutAy = 5; 

// TÜRKİYE RESMİ TATİLLER TAKVİM MOTORU (Sabit Günler)
const resmiTatiller = {
    "0-1": "Yılbaşı",
    "3-23": "Ulusal Egemenlik ve Çocuk Bayramı",
    "4-1": "Emek ve Dayanışma Günü",
    "4-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
    "6-15": "Demokrasi ve Milli Birlik Günü",
    "7-30": "Zafer Bayramı",
    "9-29": "Cumhuriyet Bayramı"
};

document.addEventListener("DOMContentLoaded", () => {
    const donemInput = document.getElementById("donemSecici");
    donemInput.value = `2026-06`;
    
    donemDegisti();
    saatiBaslat();
});

function saatiBaslat() {
    const aylar = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    function saatiGuncelle() {
        const simdi = new Date();
        let s = simdi.getHours().toString().padStart(2, '0');
        let m = simdi.getMinutes().toString().padStart(2, '0');
        let sn = simdi.getSeconds().toString().padStart(2, '0');
        document.getElementById("live-time").innerText = `${s}:${m}:${sn}`;
        document.getElementById("live-date-day").innerText = simdi.getDate().toString().padStart(2, '0');
        document.getElementById("live-date-month").innerText = aylar[simdi.getMonth()];
        const gunler = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        document.getElementById("live-date-year").innerText = `${simdi.getFullYear()}, ${gunler[simdi.getDay()]}`;
    }
    saatiGuncelle();
    setInterval(saatiGuncelle, 1000);
}

function donemDegisti() {
    const val = document.getElementById("donemSecici").value;
    if(!val) return;
    const parts = val.split("-");
    mevcutYil = parseInt(parts[0]);
    mevcutAy = parseInt(parts[1]) - 1;
    basliklariCiz();
    tabloyuCiz();
}

function ayinGunSayisi(yil, ay) { return new Date(yil, ay + 1, 0).getDate(); }

// Resmi Tatil Kontrolü Yapan Yardımcı Fonksiyon
function resmiTatilMi(ay, gun) {
    const key = `${ay}-${gun}`;
    return resmiTatiller[key] ? true : false;
}

function basliklariCiz() {
    const headerSatiri = document.getElementById("tabloBaslikSatiri");
    headerSatiri.innerHTML = '<th class="sticky-col">Personel & Görev Dağılımı</th>';
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    
    for (let g = 1; g <= toplamGun; g++) {
        const d = new Date(mevcutYil, mevcutAy, g);
        const th = document.createElement("th");
        
        // Sınıflandırma: Önce Resmi Tatil mi, yoksa Hafta sonu mu?
        if (resmiTatilMi(mevcutAy, g)) {
            th.className = "day-th public-holiday";
            th.setAttribute("title", resmiTatiller[`${mevcutAy}-${g}`]);
        } else if (d.getDay() === 0 || d.getDay() === 6) {
            th.className = "day-th weekend";
        } else {
            th.className = "day-th";
        }
        
        th.innerHTML = `${g}<span>${gunAdlari[d.getDay()]}</span>`;
        headerSatiri.appendChild(th);
    }
}

function personelEkle() {
    const ad = document.getElementById("perAdSoyad").value.trim();
    const grup = document.getElementById("perGrup").value;
    if (!ad) { alert("Lütfen personel adı giriniz!"); return; }
    const yeniPersonel = {
        id: Date.now(), ad: ad, grup: grup, donem: `${mevcutYil}-${mevcutAy}`, gunler: {}
    };
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    for (let i = 1; i <= toplamGun; i++) { yeniPersonel.gunler[i] = { durum: "BOS", normalMesai: 0, fazlaMesai: 0 }; }
    otomasyonVerisi.push(yeniPersonel);
    veriyiKaydet();
    tabloyuCiz();
    document.getElementById("perAdSoyad").value = "";
}

function personelSil(id) {
    if(confirm("Bu personeli silmek istediğinize emin misiniz?")) {
        otomasyonVerisi = otomasyonVerisi.filter(p => p.id !== id);
        veriyiKaydet();
        tabloyuCiz();
    }
}

function personelDuzenleModaliAc(id) {
    seciliPersonelId = id;
    const per = otomasyonVerisi.find(p => p.id === id);
    if(per) {
        document.getElementById("editPerAdSoyad").value = per.ad;
        document.getElementById("editPerGrup").value = per.grup;
        document.getElementById("editPersonnelModal").style.display = "block";
    }
}
function editPersonnelModalKapat() { document.getElementById("editPersonnelModal").style.display = "none"; }

function personelKartiniGuncelle() {
    const yeniAd = document.getElementById("editPerAdSoyad").value.trim();
    const yeniGrup = document.getElementById("editPerGrup").value;
    if(!yeniAd) { alert("İsim boş bırakılamaz!"); return; }
    const per = otomasyonVerisi.find(p => p.id === seciliPersonelId);
    if(per) {
        per.ad = yeniAd;
        per.grup = yeniGrup;
        veriyiKaydet();
        tabloyuCiz();
    }
    editPersonnelModalKapat();
}

// KRİTİK GÜNCELLEME: SADECE EKSTRA FAZLA MESAİLERİ TOPLAYAN ROZET MOTORU
function toplamFazlaMesaiHesapla(personel) {
    let toplamFM = 0;
    Object.values(personel.gunler).forEach(g => {
        if(g.durum === "GELDI") {
            toplamFM += g.fazlaMesai; // NormalMesai (9) tamamen elendi, sadece fazlaMesai toplanıyor
        }
    });
    return toplamFM;
}

function tabloyuCiz() {
    const tbody = document.querySelector("#anaTablo tbody");
    tbody.innerHTML = "";
    const donemKey = `${mevcutYil}-${mevcutAy}`;
    const buAyinPersonelleri = otomasyonVerisi.filter(p => p.donem === donemKey);
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);

    buAyinPersonelleri.forEach(per => {
        const tr = document.createElement("tr");
        const tdBilgi = document.createElement("td");
        tdBilgi.className = "sticky-col";
        
        // Sadece Ekstra mesaileri hesaplatıp rozete basıyoruz
        const ekstraMesaiSaati = toplamFazlaMesaiHesapla(per);

        tdBilgi.innerHTML = `
            <div class="personnel-cell-wrapper">
                <div class="personnel-info">
                    <div style="font-weight:700; color:var(--text-dark); font-size:0.95rem;">${per.ad}</div>
                    <div style='color:var(--text-muted); font-size:0.75rem; font-weight:600; margin-top:2px;'>${per.grup}</div>
                </div>
                <div class="total-hours-badge" title="Bu Ayki Toplam Fazla Mesai Saati">+${ekstraMesaiSaati} Sa</div>
                <div class="cell-actions">
                    <button onclick="personelDuzenleModaliAc(${per.id})" class="btn-per-edit" title="İsim/Görev Düzenle">
                        <i class="fa-solid fa-user-pen"></i>
                    </button>
                    <button onclick="personelSil(${per.id})" class="btn-per-delete" title="Personeli Sil">
                        <i class="fa-solid fa-user-xmark"></i>
                    </button>
                </div>
            </div>
        `;
        tr.appendChild(tdBilgi);

        for (let g = 1; g <= toplamGun; g++) {
            const d = new Date(mevcutYil, mevcutAy, g);
            const tdGun = document.createElement("td");
            
            // Renklendirme Sınıf Ataması
            if (resmiTatilMi(mevcutAy, g)) tdGun.className = "public-holiday";
            else if(d.getDay() === 0 || d.getDay() === 6) tdGun.className = "weekend";

            const gunVerisi = per.gunler[g] || { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
            const btn = document.createElement("button");
            btn.className = `day-btn ${gunVerisi.durum}`;
            
            if (gunVerisi.durum === "BOS") btn.innerText = "-";
            else if (gunVerisi.durum === "GELDI") btn.innerText = "G";
            else if (gunVerisi.durum === "GELMEDI") btn.innerText = "YOK";
            else if (gunVerisi.durum === "H_IZIN") btn.innerText = "H.İ";
            else if (gunVerisi.durum === "Y_IZIN") btn.innerText = "Y.İ";
            else if (gunVerisi.durum === "C_IZIN") btn.innerText = "C.İ";
            else if (gunVerisi.durum === "RAPOR") btn.innerText = "R";
            
            btn.onclick = () => chefDüzenlemeModaliAc(per.id, g, gunVerisi);
            tdGun.appendChild(btn);
            tr.appendChild(tdGun);
        }
        tbody.appendChild(tr);
    });
}

function chefDüzenlemeModaliAc(perId, gun, veri) {
    seciliPersonelId = perId;
    seciliGun = gun;
    const per = otomasyonVerisi.find(p => p.id === perId);
    document.getElementById("modalBaslik").innerText = `${gun}. Gün Düzenleme`;
    document.getElementById("modalDurum").value = veri.durum;
    document.getElementById("modalNormalMesai").value = veri.durum === "BOS" ? 9 : veri.normalMesai;
    document.getElementById("modalFazlaMesai").value = veri.fazlaMesai || 0;
    durumDegisti(document.getElementById("modalDurum").value);
    document.getElementById("chefModal").style.display = "block";
}

function durumDegisti(durum) {
    const nAlani = document.getElementById("normalMesaiAlani");
    const fAlani = document.getElementById("fazlaMesaiAlani");
    if (durum === "BOS" || durum !== "GELDI") { nAlani.style.display = "none"; fAlani.style.display = "none"; }
    else { nAlani.style.display = "flex"; fAlani.style.display = "flex"; }
}

function modalKapat() { document.getElementById("chefModal").style.display = "none"; }

function gunlukVeriKaydet() {
    const yeniDurum = document.getElementById("modalDurum").value;
    let yeniNormal = parseInt(document.getElementById("modalNormalMesai").value) || 0;
    let yeniFazla = parseInt(document.getElementById("modalFazlaMesai").value) || 0;
    if (yeniDurum !== "GELDI") { yeniNormal = 0; yeniFazla = 0; }
    const per = otomasyonVerisi.find(p => p.id === seciliPersonelId);
    if (per) {
        per.gunler[seciliGun] = { durum: yeniDurum, normalMesai: yeniNormal, fazlaMesai: yeniFazla };
        veriyiKaydet();
        tabloyuCiz();
    }
    modalKapat();
}

function veriyiKaydet() { localStorage.setItem("hospital_catering_enterprise_v5.5", JSON.stringify(otomasyonVerisi)); }

function excelAktar() {
    const donemKey = `${mevcutYil}-${mevcutAy}`;
    const buAyinPersonelleri = otomasyonVerisi.filter(p => p.donem === donemKey);
    if(buAyinPersonelleri.length === 0) { alert("Bu aya ait indirilecek veri bulunamadı!"); return; }
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    
    let excelData = [];
    let basliklar = ["Personel Ad Soyad", "Görev / Departman", "Toplam Fazla Mesai (+ Sa)"];
    for(let i=1; i<=toplamGun; i++) { basliklar.push(`${i}. Gün`); }
    excelData.push(basliklar);

    buAyinPersonelleri.forEach(per => {
        let satir = [per.ad, per.grup, toplamFazlaMesaiHesapla(per)];
        for(let g=1; g<=toplamGun; g++) {
            let gVeri = per.gunler[g];
            if(!gVeri || gVeri.durum === "BOS") satir.push("-");
            else if(gVeri.durum === "GELDI") satir.push(gVeri.fazlaMesai > 0 ? `G (+${gVeri.fazlaMesai}s)` : "G");
            else satir.push(gVeri.durum);
        }
        excelData.push(satir);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Puantaj Raporu");
    XLSX.writeFile(wb, `ISS_Catering_Maliyet_Raporu_${mevcutYil}_${mevcutAy + 1}.xlsx`);
}
