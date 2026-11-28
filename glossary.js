/* Terimler sözlüğü: sitede bir terimin üstüne dokununca ne anlama geldiği açılır.
   Sayfa her çizildiğinde etiketler taranır, sözlükte olanlar işaretlenir. */
const GLOSSARY = {
  // ---------- Genel puanlar ----------
  'güç': ['Güç (temkinli OVR)', 'Sıralamanın asıl ölçüsü. Oyuncunun maç başına ortalama Etki\'sinden hesaplanır: 70 lig ortalaması, 99 en yüksek. Az maç oynayanlarda sonuç şansa açık olduğu için bir belirsizlik payı düşülür (4 maçta yaklaşık 5 puan, 36 maçta 1,7 puan). Maç sayısı arttıkça bu pay küçülür. Sıralamaya girmek için en az 5 maç gerekir.'],
  'genel güç': ['Genel güç (OVR)', 'FIFA\'daki genel reyting gibi tek bir sayı. Oyuncunun tüm maçlardaki ortalama Etki\'sinden hesaplanır: 70 lig ortalaması, 99 en yüksek. Çok az maçı olanlar ortalamaya (70) doğru çekilir ki tek iyi gece bir oyuncuyu yıldız yapmasın.'],
  'genel güç (ovr)': 'genel güç',
  'ovr': 'genel güç',
  'lig puanı': ['Lig puanı', 'Satranç Elo\'su gibi maçtan maça biriken puan. Herkes 1000 ile başlar. Her maçta lobi ortalamasından iyi oynayan puan kazanır, kötü oynayan kaybeder. Kazanmak küçük bir bonus getirir: güçlü görülen takımı yenen daha çok, favoriyken kazanan daha az alır. Bir maçta en fazla ±40 puan değişir. Yarıda kalan maçlar oynanan raund oranında sayılır. Yanındaki küçük sayı son gece kazanılan veya kaybedilen puandır.'],
  'etki': ['Etki', 'Bir maçtaki performansın lobi ortalamasına oranı. 1.00 o maçtaki ortalama oyuncu demek, 1.30 ortalamanın %30 üstü. Dört şeyden oluşur: kill (%55, öldürülen oyuncu ne kadar iyiyse kill o kadar değerli), raund başına hasar (%25), KAST (%12) ve ilk kan/ilk ölüm dengesi (%8). Takımın kazanıp kaybetmesi Etki\'yi değiştirmez, kötü takıma düşen oyuncu cezalandırılmaz.'],
  'ort. etki': 'etki',
  'gidişat': ['Gidişat', 'Lig puanının maç maç nasıl değiştiğini gösteren küçük grafik. Yukarı gidiyorsa oyuncu son maçlarda puan topluyor demektir.'],
  'form': ['Form', 'Son 8 maçın sonucu, soldan sağa eskiden yeniye. Yeşil galibiyet, kırmızı mağlubiyet.'],
  'maç': ['Maç', 'Ligde sayılan maç sayısı. 4v3 ve üstü custom maçlar sayılır. Skirmish, deathmatch ve 3v3 gibi küçük maçlar sayılmaz.'],
  'g-m': ['G-M (galibiyet-mağlubiyet)', 'Kazanılan ve kaybedilen maç sayısı. Yarıda kalan maçlar buraya girmez. FF ile biten maçlar, teslim olmayan takım için galibiyet sayılır.'],
  'g - m': 'g-m',
  'galibiyet-mağlubiyet': 'g-m',
  'kazanma': ['Kazanma', 'Tamamlanan maçlarda kazanma yüzdesi.'],
  'rol': ['Rol', 'Oyuncunun özelliklerinden çıkarılan oyun tarzı: giriş oyuncusu, fare (kampçı), keskin nişancı, destekçi veya çapa. Ajan sınıfı değil, verideki davranışa göre belirlenir. Hangi özelliği ligde öne çıkıyorsa o rol yazılır.'],
  'ortalama maç notu': ['Ortalama maç notu', 'Her maçın Etki\'si 4 ile 10 arasında bir nota çevrilir, futbol maç notları gibi. 6.5 ortalama bir maç, 7.5 üstü çok iyi, 5.5 altı kötü. Bu sayı tüm maçların ortalamasıdır.'],
  'son maçlar': ['Son maçlar', 'Son 6 maçın notu. Yeşil çok iyi, sarı ortalama, kırmızı kötü. Bir nota dokununca o maçın sayfası açılır.'],

  // ---------- Temel istatistikler ----------
  'k/d': ['K/D', 'Kill sayısının ölüm sayısına bölümü. 1\'in üstü öldüğünden çok öldürdüğü anlamına gelir.'],
  'kpr': ['KPR (raund başına kill)', 'Toplam kill bölü oynanan raund sayısı. 1.00, her raundda ortalama bir kill demek.'],
  'acs': ['ACS (ortalama savaş skoru)', 'Oyunun kendi verdiği skorun raund başına ortalaması. Kill, hasar, çoklu kill ve asistler skoru artırır. 200 civarı ortalama, 250 üstü çok iyidir.'],
  'adr': ['ADR (raund başına hasar)', 'Bir raundda rakiplere verilen ortalama hasar. Kill alınamasa bile verilen hasar burada görünür. 150 civarı iyi bir değerdir.'],
  'hasar': ['Hasar', 'Raund başına rakiplere verilen ortalama hasar (ADR). Özellik kartında ligdeki diğer oyunculara göre 1-20 arası puanlanır.'],
  'hs%': ['HS% (kafa vuruşu yüzdesi)', 'İsabet eden mermilerin yüzde kaçının kafaya geldiği. Gövde ve bacak isabetleri de hesaba girer. Yüksekse nişan iyi demektir.'],
  'kast': ['KAST', 'Bir raunda katkı yapılan raundların yüzdesi. Bir raund şu dört şeyden biri olursa sayılır: Kill aldı, Asist yaptı, Sağ kaldı ya da öldü ama intikamı 5 saniye içinde alındı (Traded). Yüksekse oyuncu neredeyse her raundda işe yarıyor demektir.'],
  'kill/ölüm/asist': ['Kill / Ölüm / Asist', 'Tüm maçlardaki toplam kill, ölüm ve asist sayısı.'],
  'k / d / a': 'kill/ölüm/asist',
  'ilk kan / ilk ölüm': ['İlk kan / İlk ölüm', 'İlk kan: raundun ilk kill\'ini alan oyuncu. İlk ölüm: raundun ilk ölen oyuncusu. Raundu 5\'e 4 başlatmak büyük avantaj olduğu için ilk kan çok değerlidir.'],
  'ilk kan': ['İlk kan', 'Raundun ilk kill\'ini alma sayısı. Raundu 5\'e 4 başlatmak büyük avantaj sağlar.'],
  'clutch': ['Clutch', 'Takımında tek kişi kaldığında raundu kazanma. Yazılış "kazanılan / denenen" şeklindedir: 3/10, tek kaldığı 10 raundun 3\'ünü kazandığı anlamına gelir.'],
  'clutch kazanılan': 'clutch',
  '3k, 4k, ace': ['3K, 4K, ace', 'Bir raundda 3 kill, 4 kill ve rakip takımın tamamını tek başına öldürme (ace) sayısı. 4v4 maçlarda 4 kill de ace sayılır.'],
  'ace': ['Ace', 'Bir raundda rakip takımın herkesini tek başına öldürmek. 5v5\'te 5 kill, 4v4\'te 4 kill.'],
  '4 kill': ['4 kill', 'Bir raundda 4 kill almak (rakip takım 5 kişiyken).'],
  'eko kill': ['Eko kill', 'Kendi ekipmanının değeri, öldürdüğü rakibinkinin yarısından azken alınan kill. Örneğin 800 kredilik tabancayla 3900 kredilik Vandal\'lı rakibi vurmak. Parasız raundlarda iş çıkaranları gösterir.'],
  'fare (kamp) kill': ['Fare (kamp) kill', 'Bir yerde en az 8 saniye bekleyip (3-4 metre içinde kıpırdamadan) gelen rakibi vurmak. Köşeye yatmak, savunmada bir noktayı tutmak gibi. Oyuncuların konumu sadece kill anlarında bilinir, bu yüzden raundun ilk kill\'i kamp olsa bile ölçülemez. Elle eklenen eski Tracker maçlarında bu bilgi yoktur.'],
  'fare': 'fare (kamp) kill',
  'fare (kamp kill)': 'fare (kamp) kill',
  'gecenin faresi': ['Gecenin faresi', 'O gece en çok fare (kamp) kill\'i alan oyuncu. En az 2 kamp kill gerekir. Kamp kill: bir yerde en az 8 saniye bekleyip gelen rakibi vurmak.'],
  'maçı sattı': ['Maçı sattı', 'Kaybeden takımda en kötü oynayan olarak "maçı satan" seçildiği maç sayısı. En çok Etki\'ye bakılır; kritik anlarda ilk ölen olmak, takımından kopup yalnız ölmek, intikamı alınmayan ölümler ve kaybedilen clutch\'lar da ceza puanı ekler.'],
  'maçı satan': 'maçı sattı',
  'maçı satan (utanç köşesi)': 'maçı sattı',
  'takımı sırtladı': ['Takımı sırtladı', 'Kazanan takımda en yüksek Etki\'yi yaparak maçın "sırtlayanı" seçildiği maç sayısı.'],
  'sırtlayan': ['Sırtlayan', 'Kazanan takımda en yüksek Etki\'yi yapan oyuncu. Maç yarıda kaldıysa iki takımdan en yüksek Etki\'yi yapan seçilir.'],
  'takımı sırtlayan': 'takımı sırtladı',

  // ---------- Düello ve trade ----------
  'ilk düellolar': ['İlk düellolar', 'Raundun ilk çatışması. Çubuk üç parçadır: yeşil, ilk düelloyu kazandığı raundlar; sarı, ilk ölen oldu ama takım arkadaşı katilini 5 saniye içinde vurdu; kırmızı, ilk ölen oldu ve intikamı alınmadı. Kırmızı ne kadar azsa giriş o kadar sağlıklıdır.'],
  'ilk düello': ['İlk düello kazanma', 'Raundun ilk çatışmasına girdiğinde kazanma yüzdesi: ilk kan / (ilk kan + ilk ölüm).'],
  'ilk düello kazanma': 'ilk düello',
  'trade kill': ['Trade kill', 'Takım arkadaşı öldükten sonra 5 saniye içinde onun katilini vurmak. İyi takım oyununun ve doğru pozisyonun göstergesidir.'],
  'trade': 'trade kill',
  'intikamı alınan ölüm': ['İntikamı alınan ölüm', 'Ölümlerin yüzde kaçında takım arkadaşlarının katili 5 saniye içinde vurduğu. Yüksekse oyuncu takımına yakın oynuyor, ölümü boşa gitmiyor demektir.'],
  'hasar farkı': ['Hasar farkı', 'Raund başına verilen hasar eksi alınan hasar. Artı ise çatışmalardan genelde kârlı çıkıyor demektir.'],
  'hasar farkı (raund başı)': 'hasar farkı',

  // ---------- Ekonomi ----------
  'tabanca raundu': ['Tabanca raundu', 'Her yarının ilk raundu, herkesin sadece tabanca ve az yetenekle başladığı raund. Burada raund başına kill sayısı gösterilir.'],
  'tabanca raundu kill': 'tabanca raundu',
  'eko (2000 altı)': ['Eko raundu', 'Oyuncunun üstündeki ekipmanın (silah, zırh, yetenekler) toplam değeri 2000 kredinin altında olduğu raundlar. Parasız raund demek.'],
  'eko': 'eko (2000 altı)',
  'yarım alım': ['Yarım alım', 'Ekipman değeri 2000 ile 3900 kredi arasında olan raundlar. Genelde Spectre, Bulldog veya zırhsız tüfek gibi eksik alımlar.'],
  'yarım': 'yarım alım',
  'tam alım (3900+)': ['Tam alım', 'Ekipman değeri 3900 kredi ve üstü olan raundlar: tam zırh ve Vandal, Phantom ya da Operator gibi tam silah.'],
  'tam alım': 'tam alım (3900+)',
  'eko verimi': ['Eko verimi', 'Eko raundlarındaki raund başına kill\'in tam alım raundlarındakine oranı. 1\'e ne kadar yakınsa oyuncu parasız kalınca o kadar az düşüyor demektir. 1\'in üstüyse ekoda daha bile iyi oynuyor.'],
  'eko kazanma': ['Eko kazanma', 'Eko raundlarının yüzde kaçının kazanıldığı.'],
  'ekonomi': ['Ekonomi', 'Raund başına eko kill: rakibinin ekipmanının yarısından ucuz ekipmanla alınan kill. Özellik kartında ligdeki diğer oyunculara göre 1-20 arası puanlanır.'],

  // ---------- FM özellikleri ----------
  'nişancılık': ['Nişancılık', 'Kafa vuruşu yüzdesi. Özellik kartındaki tüm puanlar 1-20 arasıdır ve ligdeki diğer oyunculara göre verilir: ligin en iyisi 20, en kötüsü 1 alır.'],
  'öldürücülük': ['Öldürücülük', 'Raund başına kill. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'uzun menzil': ['Uzun menzil', 'Kill\'lerin ne kadarının Operator, Marshal, Outlaw ve Guardian ile alındığı. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'tabanca': ['Tabanca', 'Kill\'lerin ne kadarının tabancayla (Classic, Shorty, Frenzy, Ghost, Sheriff) alındığı. Tabloda ise tabanca raundlarındaki raund başına kill. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'giriş': ['Giriş', 'Raund başına ilk kan. Siteye ilk girip ilk kill\'i alan oyuncular yüksek puan alır. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'soğukkanlılık': ['Soğukkanlılık', 'Takımında tek kaldığında raundu kazanma oranı (clutch). Az denemesi olan oyuncular ortalamaya çekilir. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'hayatta kalma': ['Hayatta kalma', 'Raund başına ne kadar az ölündüğü. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'pozisyon alma': ['Pozisyon alma', 'Ölümlerin ne kadarının takımdan 25 metreden uzakta, tek başına gerçekleştiği. Ne kadar az yalnız ölüm, o kadar yüksek puan. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'sinsilik': ['Sinsilik', 'Kill\'lerin ne kadarının fare (kamp) kill olduğu: bir yerde en az 8 saniye bekleyip gelen rakibi vurmak. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'takım oyunu': ['Takım oyunu', 'Raund başına asist ve KAST birlikte. Kill almasa da raunda katkı yapan oyuncular yüksek puan alır. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'destek bekleme': ['Destek bekleme', 'Ölümlerin ne kadarının intikamının 5 saniye içinde alındığı. Takımına yakın oynayan ve öldüğünde takımı karşılık verebilen oyuncular yüksek puan alır. 1-20 arası, ligdeki diğer oyunculara göre.'],
  'tutarlılık': ['Tutarlılık', 'Oyuncunun kendi ortalamasının altına ne kadar az düştüğü. Sadece kötü maçlar hesaba girer; çok iyi maçlar ceza getirmez. Düşüşler oyuncunun kendi ortalamasına oranla ölçülür. 1-20 arası, ligdeki diğer oyunculara göre.'],

  // ---------- Rozetler ve ödüller ----------
  '1v3 clutch': ['1v3 clutch', 'Takımında tek kalıp en az 3 rakibe karşı raundu kazanmak.'],
  '1v3+ clutch': '1v3 clutch',
  'gecenin mvp\'si': ['Gecenin MVP\'si', 'O gece oynanan maçlarda ortalama Etki\'si en yüksek oyuncu.'],
  'gecenin raundu': ['Gecenin raundu', 'O gece tek bir raundda en çok kill\'i alan oyuncu.'],
  'en iyi raund': 'gecenin raundu',
  'gecenin satıcısı': ['Gecenin satıcısı', 'O gece en çok maçta "maçı satan" seçilen oyuncu. Eşitlikte gecenin en düşük ortalama Etki\'si olan seçilir.'],
  'saçma ölüm': ['Saçma ölüm', 'Her gece bir kişiye verilir: o gecenin ekipman farkı en büyük ölümü. Üstünde pahalı ekipman varken çok daha ucuz ekipmanlı birine ölmek (en az 2000 kredi fark). Rozetteki sayı, bu ödülü kaç gece aldığını gösterir.'],
  'en saçma ölüm': 'saçma ölüm',
  'spike kuran': ['Spike kuran', 'Kurulan spike sayısı.'],

  // ---------- Kişiler ----------
  'ezeli düşman': ['Ezeli düşman', 'Oyuncuyu en çok öldüren rakip.'],
  'en sevdiğin kurban': ['En sevdiğin kurban', 'Oyuncunun en çok öldürdüğü rakip.'],
  'en iyi arkadaşın': ['En iyi arkadaşın', 'En az 3 maç aynı takımda oynanan kişiler arasından birlikte kazanma oranı en yüksek olan.'],
  'en kötü arkadaşın': ['En kötü arkadaşın', 'En az 3 maç aynı takımda oynanan kişiler arasından birlikte kazanma oranı en düşük olan.'],
  'en iyi arkadaşı': ['En iyi arkadaşı', 'Seçilen dönemde en az 2 maç aynı takımda oynanan kişiler arasından birlikte kazanma oranı en yüksek olan.'],
  'en çok öldürdüğü': ['En çok öldürdüğü', 'Seçilen dönemde oyuncunun en çok öldürdüğü rakip ve kaç kez öldürdüğü.'],
  'onu en çok öldüren': ['Onu en çok öldüren', 'Seçilen dönemde oyuncuyu en çok öldüren rakip ve kaç kez öldürdüğü.'],
  'en iyi maçı': ['En iyi maçı', 'Seçilen dönemde Etki\'si en yüksek olan maç.'],
  'en sevdiği silah': ['En sevdiği silah', 'Seçilen dönemde en çok kill aldığı silah.'],
  'haritaya göre en iyi ajanın': ['Haritaya göre en iyi ajanın', 'Her haritada, o haritada en az 2 maç oynanan ajanlar arasından ACS\'si en yüksek olan. 2 maç oynanan ajan yoksa en çok oynanan gösterilir.'],
  'ligin lideri': ['Ligin lideri', 'Güç sıralamasında birinci olan oyuncu.'],
};

function glossaryKey(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*\(\d+\)\s*$/, '').replace(/[↑↓]/g, '').replace(/:.*$/, '').trim();
  let k = t.toLocaleLowerCase('tr-TR');
  for (let i = 0; i < 3 && typeof GLOSSARY[k] === 'string'; i++) k = GLOSSARY[k];
  return Array.isArray(GLOSSARY[k]) ? k : null;
}

const GLOSS_SEL = ['.stat .l', 'th', '.award .t', '.cb .t', '.card > h3', '.card h3', '.fm-row > span', '.fm-role > .muted', '.fm-side > div > .muted', '.verdict .tagline', '.leader > .muted:first-child', '.duel-h'].join(',');
function annotateGlossary(root) {
  root.querySelectorAll(GLOSS_SEL).forEach((el) => {
    if (el.dataset.gl) return;
    const key = glossaryKey(el.childNodes.length ? (el.firstChild.textContent || el.textContent) : el.textContent) || glossaryKey(el.textContent);
    if (!key) return;
    el.dataset.gl = key;
    if (el.tagName === 'TH') {
      // Başlığa dokunmak sıralama yapar; açıklama için yanına küçük "?" konur
      const q = document.createElement('button');
      q.type = 'button'; q.className = 'gl-q'; q.textContent = '?'; q.setAttribute('aria-label', GLOSSARY[key][0] + ' nedir?');
      q.dataset.glk = key;
      q.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showGlossary(key, q); });
      el.appendChild(q);
    } else {
      el.classList.add('gl');
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
      // iPhone Safari, tıklanabilir görünmeyen öğelerde dokunmayı iletmez; doğrudan dinleyici eklenir
      el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showGlossary(key, el); });
    }
  });
}
function showGlossary(key, anchor) {
  const [title, body] = GLOSSARY[key];
  let box = document.getElementById('gl-pop');
  if (!box) {
    box = document.createElement('div'); box.id = 'gl-pop'; box.setAttribute('role', 'dialog');
    document.body.appendChild(box);
  }
  box.innerHTML = `<div class="gl-t">${esc(title)}</div><div class="gl-b">${esc(body)}</div><button type="button" class="gl-x" aria-label="Kapat">×</button>`;
  box.hidden = false;
  const mobile = window.innerWidth < 700;
  box.classList.toggle('sheet', mobile);
  if (!mobile && anchor) {
    const r = anchor.getBoundingClientRect();
    const w = 340;
    box.style.left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left)) + 'px';
    const below = r.bottom + 8;
    box.style.top = (below + 200 > window.innerHeight ? Math.max(12, r.top - 8 - box.offsetHeight) : below) + 'px';
  } else { box.style.left = ''; box.style.top = ''; }
  box.querySelector('.gl-x').onclick = hideGlossary;
}
function hideGlossary() { const b = document.getElementById('gl-pop'); if (b) b.hidden = true; }

document.addEventListener('click', (e) => {
  if (e.target.closest('.gl-q') || e.target.closest('.gl')) return; // kendi dinleyicileri açar
  if (!e.target.closest('#gl-pop')) hideGlossary();
}, true);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideGlossary();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('gl')) { e.preventDefault(); showGlossary(e.target.dataset.gl, e.target); }
});
new MutationObserver(() => annotateGlossary(document.getElementById('app'))).observe(document.getElementById('app'), { childList: true, subtree: true });
