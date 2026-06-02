// =========================================================================
// ENTEGRE EDİLMİŞ HAZIR BULUT ADRESİN:
const FIREBASE_URL = "https://puantaj-51bda-default-rtdb.europe-west1.firebasedatabase.app/";
// =========================================================================

let otomasyonVerisi = [];
let seciliPersonelId = null;
let seciliGun = 1; // Varsayılan olarak 1. gün seçili başlasın
let mevcutYil = 2026;
let mevcutAy = 5; 
let aktifFiltreDepartman = "HEPSİ";

const resmiTatiller = {
    "0-1": "Yılbaşı", "3-23": "Ulusal Egemenlik ve Çocuk Bayramı", "4-1": "Emek ve Dayanışma Günü",
    "4-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "6-15": "Demokrasi ve Milli Birlik Günü",
    "7-30": "Zafer Bayramı", "9-29": "Cumhuriyet Bayramı",
    // 2026 Dini Bayramlar
    "2-19": "Ramazan Bayramı Arefesi", "2-20": "Ramazan Bayramı 1. Gün", "2-21": "Ramazan Bayramı 2. Gün", "2-22": "Ramazan Bayramı 3. Gün",
    "4-26": "Kurban Bayramı Arefesi", "4-27": "Kurban Bayramı 1. Gün", "4-28": "Kurban Bayramı 2. Gün", "4-29": "Kurban Bayramı 3. Gün", "4-30": "Kurban Bayramı 4. Gün"
};

document.addEventListener("DOMContentLoaded", () => {
    const donemInput = document.getElementById("donemSecici");
    donemInput.value = `2026-06`;
    
    const parts = donemInput.value.split("-");
    mevcutYil = parseInt(parts[0]);
    mevcutAy = parseInt(parts[1]) - 1;

    saatiBaslat();
    basliklariCiz();
    
    // Canlı veri dinlemeyi başlatır
    canliBulutVeritabaniniDinle();

    window.onclick = function(event) {
        if (event.target == document.getElementById("chefModal")) modalKapat();
        if (event.target == document.getElementById("editPersonnelModal")) editPersonnelModalKapat();
        if (event.target == document.getElementById("mesaiDetayModal")) mesaiDetayModalKapat();
    }
});

function canliBulutVeritabaniniDinle() {
    if(!FIREBASE_URL || FIREBASE_URL.includes("BURAYA_FIREBASE")) {
        updateSyncStatus(false, "URL Hatası!");
        return;
    }
    const source = new EventSource(`${FIREBASE_URL}puantajData.json`);
    source.addEventListener('put', function(e) {
        const data = JSON.parse(e.data);
        if (data && data.data) {
            if(Array.isArray(data.data)) { otomasyonVerisi = data.data.filter(item => item !== null); } 
            else { otomasyonVerisi = Object.values(data.data); }
        } else if (data && data.path === "/") {
            if (data.data === null) { otomasyonVerisi = []; }
            else if(Array.isArray(data.data)) { otomasyonVerisi = data.data.filter(item => item !== null); }
            else { otomasyonVerisi = Object.values(data.data); }
        }
        updateSyncStatus(true, "Bulut Eşitleme Aktif (Multi-Device)");
        tabloyuCiz();
    }, false);

    source.onerror = function() {
        updateSyncStatus(false, "Bağlantı Kesildi! Yeniden Bağlanıyor...");
    };
}

function updateSyncStatus(isOnline, text) {
    const dot = document.getElementById("sync-status-dot");
    const label = document.getElementById("sync-status-text");
    if(!dot || !label) return;
    label.innerText = text;
    if(isOnline) {
        dot.style.background = "#10b981";
        dot.style.animation = "pulse 2s infinite";
    } else {
        dot.style.background = "#ef4444";
        dot.style.animation = "none";
    }
}

function bulutaVeriGonder() {
    fetch(`${FIREBASE_URL}puantajData.json`, {
        method: 'PUT',
        body: JSON.stringify(otomasyonVerisi),
        headers: { 'Content-Type': 'application/json' }
    });
}

function saatiBaslat() {
    const aylar = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    const gunler = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    setInterval(() => {
        const simdi = new Date();
        if(document.getElementById("live-time")) {
            document.getElementById("live-time").innerText = `${simdi.getHours().toString().padStart(2,'0')}:${simdi.getMinutes().toString().padStart(2,'0')}:${simdi.getSeconds().toString().padStart(2,'0')}`;
            document.getElementById("live-date-day").innerText = simdi.getDate().toString().padStart(2, '0');
            document.getElementById("live-date-month").innerText = aylar[simdi.getMonth()];
            document.getElementById("live-date-year").innerText = `${simdi.getFullYear()}, ${gunler[simdi.getDay()]}`;
        }
    }, 1000);
}

function filtreleDepartman(grupAdi, element) {
    aktifFiltreDepartman = grupAdi;
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if(element) element.classList.add('active');
    tabloyuCiz();
}

function donemDegisti() {
    const val = document.getElementById("donemSecici").value;
    if(!val) return;
    const parts = val.split("-");
    mevcutYil = parseInt(parts[0]);
    mevcutAy = parseInt(parts[1]) - 1;
    seciliGun = 1; // Dönem değişince günü 1'e sıfırla
    basliklariCiz();
    tabloyuCiz();
}

function ayinGunSayisi(yil, ay) { return new Date(yil, ay + 1, 0).getDate(); }
function resmiTatilMi(ay, gun) { return resmiTatiller[`${ay}-${gun}`] ? true : false; }

function basliklariCiz() {
    const headerSatiri = document.getElementById("tabloBaslikSatiri");
    if(headerSatiri) {
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
    // Mobil gün şeridini de eşzamanlı çizdiriyoruz
    mobilGunSeridiniCiz();
}

function personelEkle() {
    const ad = document.getElementById("perAdSoyad").value.trim();
    const grup = document.getElementById("perGrup").value;
    if (!ad) { alert("Lütfen personel adı giriniz!"); return; }
    
    const donemKey = `${mevcutYil}-${mevcutAy}`;
    const yeniPersonel = { id: Date.now(), ad: ad, grup: grup, donem: donemKey, gunler: {} };
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    for (let i = 1; i <= toplamGun; i++) { yeniPersonel.gunler[i] = { durum: "BOS", normalMesai: 0, fazlaMesai: 0 }; }
    
    otomasyonVerisi.push(yeniPersonel);
    bulutaVeriGonder();
    document.getElementById("perAdSoyad").value = "";
}

function personelSil(id) {
    if(confirm("Bu personeli silmek istediğinize emin misiniz?")) {
        otomasyonVerisi = otomasyonVerisi.filter(p => p.id !== id);
        bulutaVeriGonder();
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
    if(!yeniAd) return;
    const per = otomasyonVerisi.find(p => p.id === seciliPersonelId);
    if(per) {
        per.ad = yeniAd; per.grup = yeniGrup;
        bulutaVeriGonder();
    }
    editPersonnelModalKapat();
}

function toplamFazlaMesaiHesapla(personel) {
    let toplamFM = 0;
    if(personel.gunler) {
        Object.values(personel.gunler).forEach(g => { if(g && g.durum === "GELDI") toplamFM += (parseInt(g.fazlaMesai) || 0); });
    }
    return toplamFM;
}

function mesaiDetayModaliAc(personelId) {
    const per = otomasyonVerisi.find(p => p.id === personelId);
    if (!per) return;
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    document.getElementById("detayModalPersonelAdi").innerText = per.ad;
    document.getElementById("detayModalDonemYazi").innerText = `${aylar[mevcutAy]} ${mevcutYil} - Detaylı Mesai Raporu`;
    const listeKapsayici = document.getElementById("mesaiDetayListesi");
    listeKapsayici.innerHTML = "";
    let mesaiVarMi = false;
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);

    for (let g = 1; g <= toplamGun; g++) {
        if(per.gunler && per.gunler[g]) {
            const gunVeri = per.gunler[g];
            if (gunVeri.durum === "GELDI" && (gunVeri.fazlaMesai > 0 || gunVeri.normalMesai > 0)) {
                mesaiVarMi = true;
                let bayramNotu = resmiTatilMi(mevcutAy, g) ? `<span class="bayram-etiket">Bayram</span>` : "";
                const gunSatiri = document.createElement("div");
                gunSatiri.className = "mesai-detay-item";
                gunSatiri.innerHTML = `<div class="detay-tarih"><strong>${g.toString().padStart(2,'0')}.${(mevcutAy+1).toString().padStart(2,'0')}.${mevcutYil}</strong> ${bayramNotu}</div><div class="detay-saatler"><span class="normal-saat-yazi">${gunVeri.normalMesai} Sa</span><span class="fazla-saat-yazi">+${gunVeri.fazlaMesai} Sa</span></div>`;
                listeKapsayici.appendChild(gunSatiri);
            }
        }
    }
    if (!mesaiVarMi) { listeKapsayici.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px; font-size:0.9rem;">Mesai kaydı bulunamadı.</div>`; }
    document.getElementById("mesaiDetayModal").style.display = "block";
}
function mesaiDetayModalKapat() { document.getElementById("mesaiDetayModal").style.display = "none"; }

// ANA TABLO VE MOBİL KARTLARI ÇİZEN MERKEZİ GÜNCEL FONKSİYON
function tabloyuCiz() {
    // 1. Masaüstü Görünümünü Çiz
    const tbody = document.querySelector("#anaTablo tbody");
    const donemKey = `${mevcutYil}-${mevcutAy}`;
    let filtrelenmisList = otomasyonVerisi.filter(p => p && p.donem === donemKey);
    if (aktifFiltreDepartman !== "HEPSİ") { filtrelenmisList = filtrelenmisList.filter(p => p.grup === aktifFiltreDepartman); }
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);

    if(tbody) {
        tbody.innerHTML = "";
        if (filtrelenmisList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${toplamGun + 1}" style="padding: 30px; color: var(--text-muted); font-weight: 500;">Kayıtlı personel bulunamadı.</td></tr>`;
        } else {
            filtrelenmisList.forEach(per => {
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
                        <div class="total-hours-badge" onclick="mesaiDetayModaliAc(${per.id})">+${ekstraMesaiSaati} Sa</div>
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

                    const gunVerisi = (per.gunler && per.gunler[g]) ? per.gunler[g] : { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
                    const btn = document.createElement("button");
                    btn.className = `day-btn ${gunVerisi.durum}`;
                    
                    if (gunVerisi.durum === "BOS") btn.innerText = "-";
                    else if (gunVerisi.durum === "GELDI") btn.innerText = "G";
                    else if (gunVerisi.durum === "GELMEDI") btn.innerText = "YOK";
                    else if (gunVerisi.durum === "H_IZIN") btn.innerText = "H.İ";
                    else if (gunVerisi.durum === "Y_IZIN") btn.innerText = "Y.İ";
                    else if (gunVerisi.durum === "C_IZIN") btn.innerText = "C.İ";
                    else if (gunVerisi.durum === "RAPOR") btn.innerText = "R";
                    
                    btn.onclick = () => chefDüzenlemeModaliAc(per.id, g);
                    tdGun.appendChild(btn);
                    tr.appendChild(tdGun);
                }
                tbody.appendChild(tr);
            });
        }
    }

    // 2. Mobil Görünümü Çiz (Hata Çözen Kısım)
    mobilKartlariCiz();
}

function chefDüzenlemeModaliAc(perId, gun) {
    seciliPersonelId = perId; seciliGun = gun;
    const per = otomasyonVerisi.find(p => p.id === perId);
    if (!per) return;
    
    const veri = (per.gunler && per.gunler[gun]) ? per.gunler[gun] : { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
    
    document.getElementById("modalBaslik").innerText = `${gun}. Gün Düzenleme`;
    document.getElementById("modalDurum").value = veri.durum;
    document.getElementById("modalNormalMesai").value = veri.durum === "BOS" ? 9 : (veri.normalMesai || 0);
    document.getElementById("modalFazlaMesai").value = veri.fazlaMesai || 0;
    durumDegisti(veri.durum);
    document.getElementById("chefModal").style.display = "block";
}

function durumDegisti(durum) {
    if (durum !== "GELDI") { 
        document.getElementById("normalMesaiAlani").style.display = "none"; 
        document.getElementById("fazlaMesaiAlani").style.display = "none"; 
    } else { 
        document.getElementById("normalMesaiAlani").style.display = "flex"; 
        document.getElementById("fazlaMesaiAlani").style.display = "flex"; 
    }
}
function modalKapat() { document.getElementById("chefModal").style.display = "none"; }

function gunlukVeriKaydet() {
    const yeniDurum = document.getElementById("modalDurum").value;
    let yeniNormal = parseInt(document.getElementById("modalNormalMesai").value) || 0;
    let yeniFazla = parseInt(document.getElementById("modalFazlaMesai").value) || 0;
    if (yeniDurum !== "GELDI") { yeniNormal = 0; yeniFazla = 0; }
    
    const per = otomasyonVerisi.find(p => p.id === seciliPersonelId);
    if (per) {
        if(!per.gunler) per.gunler = {};
        per.gunler[seciliGun] = { durum: yeniDurum, normalMesai: yeniNormal, fazlaMesai: yeniFazla };
        bulutaVeriGonder();
    }
    modalKapat();
}

function excelAktar() {
    const donemKey = `${mevcutYil}-${mevcutAy}`;
    let buAyinPersonelleri = otomasyonVerisi.filter(p => p && p.donem === donemKey);
    if(aktifFiltreDepartman !== "HEPSİ") buAyinPersonelleri = buAyinPersonelleri.filter(p => p.grup === aktifFiltreDepartman);
    if(buAyinPersonelleri.length === 0) return;
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    
    let excelData = [];
    let basliklar = ["Personel Ad Soyad", "Görev / Departman", "Toplam Fazla Mesai (+ Sa)"];
    for(let i=1; i<=toplamGun; i++) { basliklar.push(`${i}. Gün`); }
    excelData.push(basliklar);

    buAyinPersonelleri.forEach(per => {
        let satir = [per.ad, per.grup, toplamFazlaMesaiHesapla(per)];
        for(let g=1; g<=toplamGun; g++) {
            let gVeri = per.gunler ? per.gunler[g] : null;
            if(!gVeri || gVeri.durum === "BOS") satir.push("-");
            else if(gVeri.durum === "GELDI") satir.push(gVeri.fazlaMesai > 0 ? `G (+${gVeri.fazlaMesai}s)` : "G");
            else satir.push(gVeri.durum);
        }
        excelData.push(satir);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Puantaj Raporu");
    XLSX.writeFile(wb, `ED_Yazilim_Puantaj_Raporu_${aktifFiltreDepartman}.xlsx`);
}

// =========================================================================
// MOBİL GÖRÜNÜM MOTORU VE AKILLI KART ALTYAPISI (MOBİL HATA ÇÖZÜMLERİ)
// =========================================================================

function mobilGunSeridiniCiz() {
    const serit = document.getElementById("mobilGunSeridi");
    if(!serit) return;
    serit.innerHTML = "";
    
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let g = 1; g <= toplamGun; g++) {
        const d = new Date(mevcutYil, mevcutAy, g);
        const btn = document.createElement("button");
        btn.type = "button";
        
        let cls = "btn-mobile-day";
        if(g === seciliGun) cls += " active";
        if(resmiTatilMi(mevcutAy, g)) cls += " m-holiday";
        else if(d.getDay() === 0 || d.getDay() === 6) cls += " m-weekend";
        
        btn.className = cls;
        btn.innerHTML = `${g}<span>${gunAdlari[d.getDay()]}</span>`;
        btn.onclick = () => {
            seciliGun = g;
            document.querySelectorAll(".btn-mobile-day").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            mobilKartlariCiz();
        };
        serit.appendChild(btn);
    }
}

function mobilKartlariCiz() {
    const konteyner = document.getElementById("mobilKartKapsayici");
    if(!konteyner) return;
    konteyner.innerHTML = "";

    const donemKey = `${mevcutYil}-${mevcutAy}`;
    let filtrelenmisList = otomasyonVerisi.filter(p => p && p.donem === donemKey);
    if (aktifFiltreDepartman !== "HEPSİ") { filtrelenmisList = filtrelenmisList.filter(p => p.grup === aktifFiltreDepartman); }

    if (filtrelenmisList.length === 0) {
        konteyner.innerHTML = `<div style="background:white; padding:20px; border-radius:14px; text-align:center; color:var(--text-muted); font-size:0.9rem; border:1px solid var(--border-color);">Bu departmanda kayıtlı personel bulunamadı.</div>`;
        return;
    }

    filtrelenmisList.forEach(per => {
        const kart = document.createElement("div");
        kart.className = "mobile-personnel-card";

        const gunVerisi = (per.gunler && per.gunler[seciliGun]) ? per.gunler[seciliGun] : { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
        const ekstraMesaiSaati = toplamFazlaMesaiHesapla(per);

        let harf = "-";
        if (gunVerisi.durum === "GELDI") harf = "G";
        else if (gunVerisi.durum === "GELMEDI") harf = "YOK";
        else if (gunVerisi.durum === "H_IZIN") harf = "H.İ";
        else if (gunVerisi.durum === "Y_IZIN") harf = "Y.İ";
        else if (gunVerisi.durum === "C_IZIN") harf = "C.İ";
        else if (gunVerisi.durum === "RAPOR") harf = "R";

        // ÇÖZÜM: onclick tetikleyicisini güvenli hale getirdik ve buton tıklama alanı büyütüldü
        kart.innerHTML = `
            <div class="m-card-left">
                <div class="m-per-meta">
                    <span class="m-per-name">${per.ad}</span>
                    <span class="m-per-role">${per.grup}</span>
                    <div class="m-per-actions-row">
                        <span class="m-btn-mini" onclick="mesaiDetayModaliAc(${per.id})" style="color:var(--primary); font-weight:600;"><i class="fa-solid fa-clock-history"></i> Geçmiş</span>
                        <span class="m-btn-mini" onclick="personelDuzenleModaliAc(${per.id})"><i class="fa-solid fa-user-pen"></i> Düzenle</span>
                        <span class="m-btn-mini" onclick="personelSil(${per.id})" style="color:#ef4444;"><i class="fa-solid fa-user-xmark"></i> Sil</span>
                    </div>
                </div>
            </div>
            <div class="m-card-right">
                <div class="total-hours-badge" onclick="mesaiDetayModaliAc(${per.id})">+${ekstraMesaiSaati} Sa</div>
                <button type="button" class="day-btn ${gunVerisi.durum}" onclick="chefDüzenlemeModaliAc(${per.id}, ${seciliGun})">${harf}</button>
            </div>
        `;
        konteyner.appendChild(kart);
    });
}
