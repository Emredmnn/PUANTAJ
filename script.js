// Global Değişkenler
let otomasyonVerisi = [];
let sistemLoglari = [];
let seciliPersonelId = null;
let seciliGun = null;
let mevcutYil = 2026;
let mevcutAy = 5; 
let mevcutFiltre = "HEPSİ"; 

const resmiTatiller = {
    "0-1": "Yılbaşı", "3-23": "Ulusal Egemenlik", "4-1": "Emek Bayramı",
    "4-19": "Gençlik Bayramı", "6-15": "Demokrasi Günü", "7-30": "Zafer Bayramı", "9-29": "Cumhuriyet Bayramı"
};

document.addEventListener("DOMContentLoaded", () => {
    const donemInput = document.getElementById("donemSecici");
    donemInput.value = `2026-06`;
    
    saatiBaslat();
    donemDegisti();
    
    // --- ANLIK CANLI BULUT SENKRONİZASYONU ---
    // Küresel window nesnesinden Firebase fonksiyonlarını güvenle dinliyoruz.
    if (window.onValue && window.ref && window.db) {
        const puantajRef = window.ref(window.db, 'puantaj');
        window.onValue(puantajRef, (snapshot) => {
            const data = snapshot.val();
            otomasyonVerisi = data ? Object.values(data) : [];
            tabloyuCiz();
        });

        const logRef = window.ref(window.db, 'loglar');
        window.onValue(logRef, (snapshot) => {
            const data = snapshot.val();
            sistemLoglari = data ? Object.values(data) : [];
        });
    } else {
        // Firebase yüklenene kadar küçük bir gecikmeyle tekrar dene
        setTimeout(() => {
            const puantajRef = window.ref(window.db, 'puantaj');
            window.onValue(puantajRef, (snapshot) => {
                const data = snapshot.val();
                otomasyonVerisi = data ? Object.values(data) : [];
                tabloyuCiz();
            });

            const logRef = window.ref(window.db, 'loglar');
            window.onValue(logRef, (snapshot) => {
                const data = snapshot.val();
                sistemLoglari = data ? Object.values(data) : [];
            });
        }, 1000);
    }
});

function saatiBaslat() {
    const aylar = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    function saatiGuncelle() {
        const simdi = new Date();
        document.getElementById("live-time").innerText = simdi.toLocaleTimeString('tr-TR');
        document.getElementById("live-date-day").innerText = simdi.getDate().toString().padStart(2, '0');
        document.getElementById("live-date-month").innerText = aylar[simdi.getMonth()];
        const gunler = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        document.getElementById("live-date-year").innerText = `${simdi.getFullYear()}, ${gunler[simdi.getDay()]}`;
    }
    saatiGuncelle(); setInterval(saatiGuncelle, 1000);
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
function resmiTatilMi(ay, gun) { return resmiTatiller[`${ay}-${gun}`] ? true : false; }

function basliklariCiz() {
    const headerSatiri = document.getElementById("tabloBaslikSatiri");
    if(!headerSatiri) return;
    headerSatiri.innerHTML = '<th class="sticky-col">Personel & Görev Dağılımı</th>';
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    
    for (let g = 1; g <= toplamGun; g++) {
        const d = new Date(mevcutYil, mevcutAy, g);
        const th = document.createElement("th");
        if (resmiTatilMi(mevcutAy, g)) { th.className = "day-th public-holiday"; th.setAttribute("title", resmiTatiller[`${mevcutAy}-${g}`]); }
        else if (d.getDay() === 0 || d.getDay() === 6) th.className = "day-th weekend";
        else th.className = "day-th";
        th.innerHTML = `${g}<span>${gunAdlari[d.getDay()]}</span>`;
        headerSatiri.appendChild(th);
    }
}

function görevFiltrele(görevTürü) {
    mevcutFiltre = görevTürü;
    const butonlar = document.querySelectorAll(".role-btn");
    butonlar.forEach(btn => btn.classList.remove("active"));
    if(window.event) window.event.currentTarget.classList.add("active");
    document.getElementById("panelAnaBaslik").innerText = görevTürü === "HEPSİ" ? "Aylık Personel Puantaj Paneli" : `${görevTürü} Sorumlu Paneli`;
    tabloyuCiz();
}

// BULUTA VERİ YAZMA MOTORLARI
function bulutaPuantajGonder(id, veri) { window.set(window.ref(window.db, 'puantaj/' + id), veri); }
function bulutaLogGonder(log) { window.set(window.ref(window.db, 'loglar/' + log.id), log); }

function personelEkle() {
    const ad = document.getElementById("perAdSoyad").value.trim();
    const grup = document.getElementById("perGrup").value;
    if (!ad) { alert("Lütfen personel adı giriniz!"); return; }
    
    const perId = Date.now();
    const yeniPersonel = { id: perId, ad: ad, grup: grup, donem: `${mevcutYil}-${mevcutAy}`, gunler: {} };
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    for (let i = 1; i <= toplamGun; i++) { yeniPersonel.gunler[i] = { durum: "BOS", normalMesai: 0, fazlaMesai: 0 }; }
    
    bulutaPuantajGonder(perId, yeniPersonel);
    document.getElementById("perAdSoyad").value = "";
}

function personelSil(id) {
    if(confirm("Bu personeli silmek istediğinize emin misiniz?")) {
        window.set(window.ref(window.db, 'puantaj/' + id), null); 
    }
}

function personelKartiniGuncelle() {
    const yeniAd = document.getElementById("editPerAdSoyad").value.trim();
    const yeniGrup = document.getElementById("editPerGrup").value;
    if(!yeniAd) return;
    const per = otomasyonVerisi.find(p => p.id === seciliPersonelId);
    if(per) {
        per.ad = yeniAd; per.grup = yeniGrup;
        bulutaPuantajGonder(per.id, per);
    }
    editPersonnelModalKapat();
}

function toplamFazlaMesaiHesapla(personel) {
    let toplamFM = 0;
    if(personel.gunler) {
        Object.values(personel.gunler).forEach(g => { if(g.durum === "GELDI") toplamFM += (parseInt(g.fazlaMesai) || 0); });
    }
    return toplamFM;
}

function raporlariGuncelle(filtrelenmişList) {
    let toplamFM = 0; let toplamG = 0; let toplamR = 0; let toplamIzin = 0;
    filtrelenmişList.forEach(per => {
        if(per.gunler) {
            Object.values(per.gunler).forEach(g => {
                if(g.durum === "GELDI") { toplamG++; toplamFM += (parseInt(g.fazlaMesai) || 0); }
                else if(g.durum === "RAPOR") toplamR++;
                else if(["H_IZIN", "Y_IZIN", "C_IZIN"].includes(g.durum)) toplamIzin++;
            });
        }
    });
    document.getElementById("repTotalFM").innerText = `${toplamFM} Saat`;
    document.getElementById("repTotalG").innerText = `${toplamG} Gün`;
    document.getElementById("repTotalR").innerText = `${toplamR} Gün`;
    document.getElementById("repTotalIzin").innerText = `${toplamIzin} Gün`;
}

function tabloyuCiz() {
    const tbody = document.querySelector("#anaTablo tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    const donemKey = `${mevcutYil}-${mevcutAy}`;
    
    let filtrelenmişList = otomasyonVerisi.filter(p => p.donem === donemKey);
    if(mevcutFiltre !== "HEPSİ") filtrelenmişList = filtrelenmişList.filter(p => p.grup === mevcutFiltre);

    raporlariGuncelle(filtrelenmişList);
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);

    filtrelenmişList.forEach(per => {
        const tr = document.createElement("tr");
        const tdBilgi = document.createElement("td");
        tdBilgi.className = "sticky-col";
        const ekstraMesaiSaati = toplamFazlaMesaiHesapla(per);

        tdBilgi.innerHTML = `
            <div class="personnel-cell-wrapper">
                <div class="personnel-info">
                    <div style="font-weight:700; color:var(--text-dark); font-size:0.95rem;">${per.ad}</div>
                    <div style='color:var(--text-muted); font-size:0.75rem; font-weight:600; margin-top:2px;'>${per.grup}</div>
                </div>
                <div class="total-hours-badge" style="cursor:pointer;" onclick="personelMesaiDetayAc(${per.id})" title="Tarihsel Detayları Gör">
                    +${ekstraMesaiSaati} Sa
                </div>
                <div class="cell-actions">
                    <button onclick="personelDuzenleModaliAc(${per.id})" class="btn-per-edit"><i class="fa-solid fa-user-pen"></i></button>
                    <button onclick="personelSil(${per.id})" class="btn-per-delete"><i class="fa-solid fa-user-xmark"></i></button>
                </div>
            </div>
        `;
        tr.appendChild(tdBilgi);

        for (let g = 1; g <= toplamGun; g++) {
            const d = new Date(mevcutYil, mevcutAy, g);
            const tdGun = document.createElement("td");
            if (resmiTatilMi(mevcutAy, g)) tdGun.className = "public-holiday";
            else if(d.getDay() === 0 || d.getDay() === 6) tdGun.className = "weekend";

            const gunVerisi = per.gunler ? per.gunler[g] : { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
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
            tdGun.appendChild(btn); tr.appendChild(tdGun);
        }
        tbody.appendChild(tr);
    });
}

function chefDüzenlemeModaliAc(perId, gun, veri) {
    seciliPersonelId = perId; seciliGun = gun;
    document.getElementById("modalBaslik").innerText = `${gun}. Gün Düzenleme`;
    document.getElementById("modalDurum").value = veri.durum;
    document.getElementById("modalNormalMesai").value = veri.durum === "BOS" ? 9 : (veri.normalMesai || 9);
    document.getElementById("modalFazlaMesai").value = veri.fazlaMesai || 0;
    durumDegisti(veri.durum);
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
    const yeniToplam = yeniNormal + yeniFazla;

    const per = otomasyonVerisi.find(p => p.id === seciliPersonelId);
    if (per) {
        const eskiVeri = per.gunler[seciliGun] || { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
        const eskiToplam = (parseInt(eskiVeri.normalMesai) || 0) + (parseInt(eskiVeri.fazlaMesai) || 0);

        if (eskiToplam !== yeniToplam && yeniDurum === "GELDI") {
            const simdi = new Date();
            const logId = Date.now();
            const logKaydi = { id: logId, tarih: simdi.toLocaleDateString('tr-TR'), saat: simdi.toLocaleTimeString('tr-TR'), personel: per.ad, gun: seciliGun, eskiMesai: eskiToplam, yeniMesai: yeniToplam };
            bulutaLogGonder(logKaydi);
        }

        if (yeniDurum !== "GELDI") { yeniNormal = 0; yeniFazla = 0; }
        if (!per.gunler) per.gunler = {};
        per.gunler[seciliGun] = { durum: yeniDurum, normalMesai: yeniNormal, fazlaMesai: yeniFazla };
        bulutaPuantajGonder(per.id, per); 
    }
    modalKapat();
}

function logModalAc() {
    const logListesi = document.getElementById("logListesi");
    if(!logListesi) return;
    logListesi.innerHTML = "";
    if (sistemLoglari.length === 0) { logListesi.innerHTML = "<p style='text-align:center; padding:20px; color:#94a3b8;'>Hareket yok.</p>"; }
    else {
        sistemLoglari.slice().reverse().forEach(log => {
            const item = document.createElement("div"); item.className = "log-item";
            item.innerHTML = `<span class="log-time">${log.tarih} | ${log.saat}</span><div class="log-text"><strong>${log.personel}</strong> için ${log.gun}. gün çalışma süresi güncellendi: <br><span class="log-badge">${log.eskiMesai} Sa</span> ➔ <span class="log-badge">${log.yeniMesai} Sa</span></div>`;
            logListesi.appendChild(item);
        });
    }
    document.getElementById("logModal").style.display = "block";
}
function logModalKapat() { document.getElementById("logModal").style.display = "none"; }
function editPersonnelModalKapat() { document.getElementById("editPersonnelModal").style.display = "none"; }
function personelDuzenleModaliAc(id) { seciliPersonelId = id; const per = otomasyonVerisi.find(p => p.id === id); if(per) { document.getElementById("editPerAdSoyad").value = per.ad; document.getElementById("editPerGrup").value = per.grup; document.getElementById("editPersonnelModal").style.display = "block"; } }

// --- YENİ SİHİRLİ ÖZELLİK: TARİHSEL MESAİ DETAY PENCERESİ MOTORU ---
function personelMesaiDetayAc(id) {
    const per = otomasyonVerisi.find(p => p.id === id);
    if(!per) return;
    
    document.getElementById("mesaiDetayBaslik").innerText = `${per.ad} - Mesai Geçmişi`;
    const listeYüzeyi = document.getElementById("mesaiDetayListesi");
    listeYüzeyi.innerHTML = "";
    
    let mesaiVarMi = false;
    const ayIsmi = (mevcutAy + 1).toString().padStart(2, '0');
    
    if(per.gunler) {
        Object.keys(per.gunler).forEach(gun => {
            const veri = per.gunler[gun];
            // Sadece fazla mesaisi 0'dan büyük ve durumu GELDİ olan günleri süzüyoruz
            if(veri.durum === "GELDI" && (parseInt(veri.fazlaMesai) || 0) > 0) {
                mesaiVarMi = true;
                const tarihHücresi = document.createElement("div");
                tarihHücresi.className = "log-item";
                tarihHücresi.style.borderLeftColor = "#10b981"; // Yeşil başarı çizgisi
                
                tarihHücresi.innerHTML = `
                    <span class="log-time"><i class="fa-solid fa-calendar-day"></i> ${gun.padStart(2, '0')}.${ayIsmi}.${mevcutYil}</span>
                    <div class="log-text">
                        Normal Mesai: <strong>${veri.normalMesai || 9} Saat</strong><br>
                        Fazla Mesai: <span class="log-badge" style="color:#10b981;">+${veri.fazlaMesai} Saat</span>
                    </div>
                `;
                listeYüzeyi.appendChild(tarihHücresi);
            }
        });
    }
    
    if(!mesaiVarMi) {
        listeYüzeyi.innerHTML = `<p style='text-align:center; padding:30px; color:#94a3b8; font-size:0.85rem;'><i class="fa-solid fa-circle-info"></i> Bu personelin bu dönemde fazla mesai kaydı bulunmamaktadır.</p>`;
    }
    
    document.getElementById("mesaiDetayModal").style.display = "block";
}

function mesaiDetayModalKapat() {
    document.getElementById("mesaiDetayModal").style.display = "none";
}

// Fonksiyonları Dış Dünyaya (HTML Butonlarına) Açma
window.personelEkle = personelEkle; window.personelSil = personelSil; window.personelDuzenleModaliAc = personelDuzenleModaliAc;
window.editPersonnelModalKapat = editPersonnelModalKapat; window.personelKartiniGuncelle = personelKartiniGuncelle;
window.logModalAc = logModalAc; window.logModalKapat = logModalKapat; window.modalKapat = modalKapat;
window.gunlukVeriKaydet = gunlukVeriKaydet; window.donemDegisti = donemDegisti; window.görevFiltrele = görevFiltrele;
window.personelMesaiDetayAc = personelMesaiDetayAc; window.mesaiDetayModalKapat = mesaiDetayModalKapat;
