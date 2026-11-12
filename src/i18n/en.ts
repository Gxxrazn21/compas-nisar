// English dictionary. Must have exactly the same keys and placeholders as es.ts.
import type { Key } from './es';

export const en: Record<Key, string> = {
  'brand': 'compás',
  'top.method': 'Method',
  'top.langLabel': 'Language',
  'top.home': 'Compás, go to the cover',
  'top.back': 'All stories',

  'cover.title': 'Every 12 days, a radar listens to how the Earth changes',
  'cover.tempo': 'program of stories',
  'cover.intro':
    'NISAR sees through clouds and night. Pick a story and see what changed between two of its passes.',
  'cover.programLabel': 'Available stories',
  'cover.loadingStories': 'Looking for the stories on the server…',
  'cover.storiesError':
    'The stories could not be loaded. Check that the Compás server is running and try again.',
  'cover.earth': 'Earth today, {date}',
  'cover.earthAlt': 'Image of the whole Earth taken by the DSCOVR satellite',

  'story.panelLabel': 'Story guide',
  'story.stepOf': 'Step {n} of {total}',
  'story.steps': 'Story steps',
  'story.prev': 'Previous',
  'story.next': 'Next',
  'story.sources': 'Learn more',
  'story.lens': 'Reading lens: {lens}',
  'story.comparing': 'Comparing {before} with {after}',
  'story.free.title': 'Comparison of stack {stack}',
  'story.free.text': 'Pick two notes on the score and press “Compare these dates”.',
  'story.danceHint': 'Fetches the full series of passes and plays it over the map.',

  'load.title': 'Computing the change',
  'load.fresh':
    'If this comparison is new, we download two NISAR images of about 5 MB each and align them. It usually takes 5 to 20 seconds.',
  'load.elapsed': '{s} seconds so far.',
  'load.slow': 'This is taking longer than usual; the NASA service may be slow.',
  'err.title': 'The change could not be computed',
  'err.network':
    'There is no connection to the Compás server. Check that it is running and try again.',
  'err.notFound':
    'There is no NISAR data for that pair of dates at this place. Try two other passes on the score.',
  'err.invalid': 'Those dates cannot be compared: {detail}',
  'err.invalidPlain':
    'Those dates cannot be compared. Pick two analyzable passes taken in the same acquisition mode.',
  'err.upstream': 'NASA’s image service did not respond. Wait a moment and try again.',
  'err.generic': 'Something went wrong computing the change. Try again in a moment.',
  'err.retry': 'Try again',

  'layer.group': 'Map layer',
  'layer.before': 'Before',
  'layer.after': 'After',
  'layer.swipe': 'Curtain',
  'layer.change_hh': 'HH change',
  'layer.change_hv': 'HV change',
  'layer.classes': 'Signals',
  'layer.composite': 'Composite',
  'layer.hint.before': 'The earlier pass, as published by NASA.',
  'layer.hint.after': 'The later pass, as published by NASA.',
  'layer.hint.swipe': 'Drag the curtain to compare before and after.',
  'layer.hint.change_hh': 'Blue: the return dropped. Red: the return rose. HH channel.',
  'layer.hint.change_hv': 'Blue: the return dropped. Red: the return rose. HV channel.',
  'layer.hint.classes': 'The classes in the list, painted on the map.',
  'layer.hint.composite': 'Red: more signal after. Cyan: more signal before.',
  'map.opacity': 'Layer opacity',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  'map.backToArea': 'Back to the area',
  'map.curtain': 'Curtain between before and after',
  'map.curtainBefore': 'Before: {date}',
  'map.curtainAfter': 'After: {date}',
  'map.label': 'Interactive map of the planet',
  'map.attribution':
    'Satellite imagery: Esri, Maxar, Earthstar Geographics and the GIS user community. Radar: NISAR, NASA and ISRO, via ASF.',
  'sheet.toggle': 'Show or hide the panel',

  'read.title': 'Reading',
  'read.summary': '{between}, a possible change showed up across {changed} of the {valid} observed.',
  'read.summaryNone': '{between}, no change above the threshold showed up across the {valid} observed.',
  'read.days': 'There were {days} days between the two passes.',
  'conf.alta': 'High confidence in this comparison',
  'conf.media': 'Medium confidence: read the figures with care',
  'conf.baja': 'Low confidence: read the figures as guidance',
  'conf.reason.corr':
    'The correlation between the two dates is {value}: a large part of the scene changed or the brightness stretches differ.',
  'conf.reason.fit':
    'Only {value} of the pixels agree with the fit between dates; at least 80% was expected.',
  'conf.lead.media':
    'A sizeable part of the scene changed between these dates. The patches are reliable as leads; the figures, less so.',
  'conf.lead.baja':
    'This does not mean the result is wrong: so much of the scene changed between these dates that the radar loses its reference point. The patches still work as leads; the square kilometers, only as an order of magnitude.',

  'classes.title': 'What changed',
  'classes.legend': 'Map classes and their extent',
  'classes.none': 'No area passed the 3 dB threshold between these two dates.',
  'classes.share': 'Each bar is compared with the largest class.',

  'probe.title': 'A point on the map',
  'probe.hint': 'Click the map to see how much the radar return changed at that point.',
  'probe.loading': 'Querying the point…',
  'probe.invalid': 'That point is outside the frame or has no data. Try somewhere else.',
  'probe.error': 'That point could not be queried. Try again.',
  'probe.before': 'Before',
  'probe.after': 'After',
  'probe.delta': 'Change',
  'probe.class': 'Class',
  'probe.stable': 'No change above the threshold',
  'probe.note': 'Values in dB relative to the scene, not calibrated.',
  'probe.at': 'Point {lon}, {lat}',
  'probe.marker': 'Probed point',

  'hist.title': 'How much the return changed (HH)',
  'hist.axis': 'Change in approximate dB',
  'hist.desc':
    'Histogram of per-pixel change between the two dates. On the left the return dropped; on the right it rose. The lines mark the 3 dB threshold.',

  'prov.title': 'Provenance',
  'prov.before': 'Before',
  'prov.after': 'After',
  'prov.quality.validated': 'validated',
  'prov.quality.provisional': 'provisional',
  'prov.quality.beta': 'beta',
  'prov.track': 'Track {track}, frame {frame}, {direction} orbit',
  'prov.direction.DESCENDING': 'descending',
  'prov.direction.ASCENDING': 'ascending',
  'prov.pol.dual': 'Dual polarization (HH and HV)',
  'prov.pol.single': 'Single polarization (HH only)',
  'prov.georef.kml': 'Corners taken from the scene’s official KML file.',
  'prov.georef.stack-kml':
    'Corners taken from the KML of another scene in the same stack; the grid is fixed within a stack.',
  'prov.georef.footprint':
    'Corners estimated from the published footprint: an error of 1 to 3 pixels.',
  'prov.asf': 'View on ASF',
  'prov.asfLabel': 'View the {date} product in the ASF search',
  'prov.mode': 'Acquisition mode {mode}',
  'prov.cycle': 'cycle {cycle}',

  'limits.title': 'Limits',
  'limits.1': 'Decibels are approximate: they come from preview images, not calibrated data.',
  'limits.2':
    'The change is measured relative to the whole scene: whatever changes equally across the frame, such as general moisture after rain, is absorbed.',
  'limits.3':
    'Where the surface is very dark or very bright, the real change can be larger than shown.',
  'limits.4': 'Every class is a hypothesis, never a confirmed event.',
  'limits.provisional': 'At least one of the scenes is provisional and may change once validated.',
  'limits.method': 'How it is computed, step by step',

  'score.title': 'Score',
  'score.tempo': 'every 12 days',
  'score.label': 'Score of NISAR passes: each note is one pass of the radar',
  'score.compare': 'Compare these dates',
  'score.compareSame': 'These dates are already on the map.',
  'score.compareNeed': 'First pick the two notes, before and after.',
  'score.dance': 'Watch the dance',
  'score.pickBefore': 'Pick the “before” note.',
  'score.pickAfter': 'Now pick the “after” note.',
  'score.ready': 'Ready: press “Compare these dates”.',
  'score.before': 'before',
  'score.after': 'after',
  'score.noteAria': '{date}, {quality}',
  'score.noteBefore': '{date}, {quality}, before note',
  'score.noteAfter': '{date}, {quality}, after note',
  'score.blocked.not-analyzable':
    'This pass belongs to the beta collection: it only has a preview and cannot be compared.',
  'score.blocked.other-mode':
    'That pass was taken in another acquisition mode ({mode}); only dates in the same mode ({anchor}) can be compared.',
  'score.blocked.same-date': 'Pick a date different from the “before” one.',
  'score.pitch': 'The higher the note, the more radar return at the center of the area.',
  'score.loading': 'Loading the score…',
  'score.error': 'The score of this stack could not be loaded.',

  'dance.series':
    'Asking NISAR for the series of passes. {s} seconds so far; the first time it can take up to a minute.',
  'dance.preload': 'Preparing frames: {n} of {total}.',
  'dance.error': 'The dance could not be prepared. Try again.',
  'dance.errorDetail': 'The dance could not be prepared: {detail}',
  'dance.controls': 'Dance controls',
  'dance.play': 'Play',
  'dance.pause': 'Pause',
  'dance.stop': 'Leave the dance',
  'dance.loop': 'Loop',
  'dance.prev': 'Previous frame',
  'dance.next': 'Next frame',
  'dance.frame': 'Frame {n} of {total}, {date}',
  'dance.point': 'Each note rises or falls with the HH return at the center of the area.',
  'dance.cancel': 'Cancel',

  'method.title': 'How the change is computed',
  'method.close': 'Close',
  'method.intro':
    'Compás does not measure the ground: it compares two radar photographs of the same place and points out where the signal changed. This is the full recipe.',
  'method.s1.title': 'Where the images come from',
  'method.s1.text':
    'NISAR is a radar from NASA and the Indian space agency (ISRO). It passes over the same place every 12 days and sees it at night and through clouds. We use the preview images NASA publishes for each pass, with two channels: HH and HV, two ways of sending and receiving the signal.',
  'method.s2.title': 'Why they cannot simply be subtracted',
  'method.s2.text':
    'Each preview image is stretched on its own: clipped between its 5th and 95th percentiles and compressed with a square root. Two dates do not share a scale. Before comparing, the method brings them to a common scale with a robust linear fit over the whole frame, and only compares the range where both images carry information.',
  'method.s3.title': 'What “approximate dB” means',
  'method.s3.text':
    'A decibel is a logarithmic way of saying how many times the signal changed: 3 dB is roughly double or half. Because we start from stretched images rather than calibrated data, the dB are approximate: they help locate and rank changes, not quote a physical value. On very dark or very bright surfaces the real change can be larger than shown.',
  'method.s4.title': 'How it is classified',
  'method.s4.text':
    'A pixel counts as changed if the signal rises or drops by 3 dB or more. Then we look at which channel changed and whether the surface was dark, like water or wet snow: that gives seven classes. The name you see depends on the lens, because the same signal means different things in a rainforest and on a glacier.',
  'method.s5.title': 'Why everything says “possible”',
  'method.s5.text':
    'A radar does not see water: it sees how the signal bounces. A drop in return fits new water, but also other causes. That is why every label is a hypothesis to look at more closely, never a confirmed event.',
  'method.s6.title': 'What this tool cannot claim',
  'method.s6.1': 'It does not measure floods, deforestation or melt with calibrated values.',
  'method.s6.2': 'It cannot tell the cause of a change, only that the signal changed.',
  'method.s6.3':
    'A change that affects the whole scene equally, such as general moisture after rain, is absorbed by the normalization.',
  'method.s6.4': 'It only compares passes taken in the same acquisition mode.',
  'method.s6.5':
    'When confidence is low, so much of the scene changed that the normalization stops being reliable.',
  'method.formula': 'Reference formula',
  'method.formulaText': 'Δ ≈ 10·log10((q₂ + c) / (α·q₁ + β + c)), with q = ((ND − 1) / 254)² and c = 0.03',
  'method.sources': 'Sources and version',
  'method.sourcesText':
    'Images: NISAR GCOV (NASA and ISRO), distributed by ASF DAAC. Base map: Esri World Imagery. Earth today: NASA EPIC. Method version: 3.',

  'nav.label':
    'Sections',
  'nav.stories':
    'Stories',
  'nav.explore':
    'Explore',
  'nav.live':
    'Live',
  'explore.panelLabel':
    'Explore the world',
  'explore.title':
    'Explore any place',
  'explore.intro':
    'Click the globe or type some coordinates. We list the stacks of NISAR passes that cover that point.',
  'explore.titleShort':
    'Explore',
  'explore.lon':
    'Longitude',
  'explore.lat':
    'Latitude',
  'explore.go':
    'Find stacks',
  'explore.coordsInvalid':
    'Enter a longitude between −180 and 180 and a latitude between −90 and 90.',
  'explore.examples':
    'Places to try',
  'explore.ex.mojana':
    'La Mojana, Colombia',
  'explore.ex.iceland':
    'Iceland',
  'explore.ex.california':
    'California Central Valley',
  'explore.ex.punjab':
    'Punjab, India',
  'explore.point':
    'Point {lon}, {lat}.',
  'explore.otherPlace':
    'Pick another place',
  'explore.searching':
    'Looking for NISAR stacks over this point…',
  'explore.stacksError':
    'Could not fetch the NISAR stacks. Check that the Compás server is running and pick the point again.',
  'explore.empty.title':
    'NISAR has no data here yet',
  'explore.empty.text':
    'No GCOV stack covers this point: NISAR does not yet observe the whole planet with this product. Try another place, for example one of these.',
  'explore.stacksTitle':
    'Stacks covering this point: {n}',
  'explore.stacksHelp':
    'A stack is the series of NISAR passes over one frame, from the same track and in the same direction. Pick one to see its footprint and dates.',
  'explore.stackTitle':
    'Track {track}, frame {frame}, {direction}',
  'explore.stackDates':
    '{n} analyzable dates out of {total}',
  'explore.stackRange':
    'from {first} to {last}',
  'explore.stackPol':
    'Polarizations: {pol}',
  'explore.otherStack':
    'See the other stacks at this point',
  'explore.around.pair':
    'We picked the passes around the event: the last one before it and the first one after it. Check the dates and press “Compare these dates”.',
  'explore.around.before-only':
    'There is no pass after the event yet. We selected the last one before it; once NISAR flies over again you can compare it with the new one.',
  'explore.around.none':
    'No stack at this point has analyzable passes before and after that date. Pick a stack and the dates you want.',
  'explore.lens':
    'Reading lens',
  'explore.lensHelp':
    'It changes how signals are named depending on the terrain.',
  'explore.area':
    'Analysis area',
  'explore.area.view':
    'Current map view',
  'explore.area.full':
    'Full frame',
  'explore.area.viewHelp':
    'Zoom in on the area before comparing: what you see is analyzed, clipped to the footprint. It is clearer and faster.',
  'explore.area.fullHelp':
    'The whole frame of the stack is analyzed, whatever the map shows.',
  'explore.areaNote.view':
    'The map view at the moment of comparing was analyzed.',
  'explore.areaNote.full':
    'The full frame was analyzed.',
  'explore.areaNote.covers':
    'The view covered almost the whole frame, so the full frame was analyzed.',
  'explore.areaNote.outside':
    'The view was outside the frame, so the full frame was analyzed.',
  'explore.pickHint':
    'On the score, pick the “before” note and the “after” note, then press “Compare these dates”.',
  'explore.scoreEmpty':
    'Pick a place and a stack: its passes will appear here as notes.',
  'explore.marker':
    'Point chosen to explore',
  'live.panelLabel':
    'What is happening now',
  'live.title':
    'Live',
  'live.intro':
    'What is happening on Earth right now and what NISAR has just observed.',
  'live.tabs':
    'What to show on the map',
  'live.tab.events':
    'Natural events',
  'live.tab.urgent':
    'Urgent response',
  'live.events.loading':
    'Fetching the events of the last few days…',
  'live.events.error':
    'Natural events could not be loaded. The NASA service may be slow.',
  'live.events.count':
    '{n} events from the last {days} days',
  'live.events.none':
    'No category is visible: turn one on above.',
  'live.events.list':
    'Events sorted by date',
  'live.filter':
    'Filter by category',
  'live.showAll':
    'Show all',
  'live.more':
    'Show {n} more',
  'live.card':
    'Selected item',
  'live.closed':
    'closed',
  'live.open':
    'ongoing',
  'live.linkEonet':
    'See on EONET',
  'live.linkSource':
    'See the source',
  'live.explore':
    'Explore the NISAR passes here',
  'live.exploreHelp':
    'Takes you to Explore at this point and preselects the passes around the date, if they exist.',
  'live.urgent.loading':
    'Fetching the latest urgent acquisitions…',
  'live.urgent.error':
    'Urgent acquisitions could not be loaded. Try again in a moment.',
  'live.urgent.intro':
    'NISAR publishes what it observes during an emergency almost in real time. The violet footprints on the map are those areas.',
  'live.urgent.stack':
    'Stack {stack}, products {products}',
  'live.urgent.preview':
    'See the preview',
  'live.urgent.list':
    'Urgent acquisitions, newest first',
  'live.sources':
    'Sources: events from NASA EONET; NISAR urgent-response acquisitions from ASF DAAC.',
  'live.footer':
    'Events: NASA EONET. Acquisitions: NISAR, NASA and ISRO, via ASF. Satellite imagery: Esri, Maxar, Earthstar Geographics and the GIS user community.',
  'cat.wildfires':
    'Wildfires',
  'cat.floods':
    'Floods',
  'cat.severeStorms':
    'Severe storms',
  'cat.volcanoes':
    'Volcanoes',
  'cat.earthquakes':
    'Earthquakes',
  'cat.landslides':
    'Landslides',
  'cat.drought':
    'Drought',
  'cat.dustHaze':
    'Dust and haze',
  'cat.seaLakeIce':
    'Sea and lake ice',
  'cat.snow':
    'Snow',
  'cat.tempExtremes':
    'Extreme temperatures',
  'cat.waterColor':
    'Water color',
  'cat.manmade':
    'Human-caused events',
  'lupa.title':
    'Calibrated lens',
  'lupa.helpProbe':
    'Reads the full calibrated NISAR product in a window around the point you probed.',
  'lupa.helpCenter':
    'Reads the full calibrated NISAR product in a window around the map center. If you probe a point, the window is centered there.',
  'lupa.size':
    'Window size',
  'lupa.sizeKm':
    '{n} km',
  'lupa.open':
    'Calibrated lens here',
  'lupa.slow':
    'The first time it downloads 50 to 90 MB and takes 20 to 40 seconds.',
  'lupa.badge':
    'Calibrated lens',
  'lupa.badgeText':
    'Real dB of calibrated γ⁰ at {res} m, in a {size} km window. These are not the approximate dB of the overview.',
  'lupa.back':
    'Back to the overview',
  'lupa.load.title':
    'Reading the calibrated product',
  'lupa.load.text':
    'We read a {size} km window of the full NISAR GCOV product, which weighs about 6 GB; we only download the window.',
  'lupa.load.open':
    'Opening the file and reading its metadata…',
  'lupa.load.read':
    'Downloading the window for both dates, 50 to 90 MB…',
  'lupa.load.calc':
    'Computing the change in real dB…',
  'lupa.load.cache':
    'The windows of the stories are already cached and answer instantly.',
  'lupa.load.cancel':
    'Cancel and go back to the overview',
  'lupa.err.title':
    'The calibrated lens could not be opened',
  'conf.gcov.title':
    'Less than half of the window has data',
  'conf.gcov.text':
    'Part of the window falls outside the product or in strips without signal: the figures describe only the area with data.',
  'probe.noteCal':
    'Values in real dB of calibrated γ⁰.',
  'hist.axisCal':
    'Change in real dB',
  'prov.georef.product':
    'Corners computed from the projection of the calibrated product itself.',
  'prov.resolution':
    'Resolution of {m} m per pixel.',
  'limits.cal.1':
    'Decibels are real (calibrated γ⁰), but each 30 m pixel averages 3×3 pixels of 10 m: radar speckle leaves a few dB of noise in single pixels.',
  'limits.cal.2':
    'There is no normalization between dates: a general change in moisture or roughness does show up.',
  'limits.cal.3':
    'It only covers a 10 to 20 km window, not the whole scene.',
  'story.zoomHint':
    'The right-hand panel switches to real dB. Use “Back to the overview” to return to the full map.',
  'read.collapse':
    'Collapse reading',
  'read.expand':
    'Show reading',
  'export.title':
    'Export',
  'export.json':
    'Download report (JSON)',
  'export.copy':
    'Copy link',
  'export.help':
    'The report includes dates, method, statistics, provenance and limits. The link reopens this same view.',
  'export.copied':
    'Link copied.',
  'export.copyFail':
    'Could not copy: copy the address from the browser bar.',
  'export.layers':
    'Download the layers (PNG)',
  'basemap.group':
    'Base map',
  'basemap.sat':
    'Satellite',
  'basemap.optical':
    'Optical of the day',
  'basemap.hint':
    'Daily optical image for the “after” date: what a satellite that cannot see through clouds would see.',
  'basemap.swipeHint':
    'Not available with the curtain.',
  'basemap.note':
    'Optical of the day, {date}: what an optical satellite would have seen. Often only clouds show; NISAR’s radar sees through them.',
  'basemap.attribution':
    'Optical imagery: NASA GIBS, VIIRS.',
  'layer.group.image':
    'Image',
  'layer.group.change':
    'Change',
  'layer.group.reading':
    'Reading',
  'map.zoomGroup':
    'Zoom',
  'ig.loading':
    'Looking for the latest interferograms over this place…',
  'ig.error':
    'Interferograms could not be loaded. Try again in a moment.',
  'ig.errorDetail':
    'Interferograms could not be loaded: {detail}',
  'ig.none':
    'There are no recent interferograms over this point.',
  'ig.pairTrack':
    'Track {track}, {direction}',
  'ig.pairs':
    'Date pairs',
  'ig.pairDates':
    'From {reference} to {secondary}',
  'ig.sentence':
    'Interferogram between the reference pass of {reference} and the secondary pass of {secondary}.',
  'ig.sentenceNone':
    'NISAR interferograms over this place.',
  'ig.what.title':
    'What you are looking at',
  'ig.what.text':
    'An interferogram compares the phase of the radar wave between two passes. If the ground moved between them, the phase changes, and the change is painted in color.',
  'ig.fringes':
    'Each fringe, one full color cycle, corresponds to ground motion of half a wavelength along the radar line of sight: in L-band, about 12 cm.',
  'ig.product.title':
    'An official product, unprocessed',
  'ig.product.text':
    'The image is the official preview of NISAR’s provisional GUNW product, as NASA publishes it. Compás does not recompute or interpret it.',
  'ig.georef':
    'The georeferencing is approximate: it is estimated from the scene footprint, not from the product’s own geolocation.',
  'ig.limit.1':
    'Fringes can come from ground motion, but also from the atmosphere and from topography.',
  'ig.limit.2':
    'To measure centimeters you need the product data, not its preview image.',
  'ig.limit.3':
    'Where the image has no color there is no data, or the signal was lost between the two passes.',
  'ig.source':
    'Source: NISAR provisional GUNW, distributed by ASF DAAC.',
  'method.s7.title':
    'The calibrated lens',
  'method.s7.text':
    'The lens reads, in a 10 to 20 km window, the full NISAR GCOV product (γ⁰ at 10 m, averaged to 30 m) instead of the preview image. Decibels are real and there is no normalization between dates: a general change in moisture does show up. The threshold is still 3 dB and “dark” means HH of −18 dB or less. In exchange, it needs an Earthdata account on the server and the first time it downloads 50 to 90 MB. The overview covers the whole scene in seconds, but with approximate dB.',
  'method.s8.title':
    'How close the overview is to the calibrated data',
  'method.s8.text':
    'We checked it in a 15 km window of La Mojana, between June 26 and October 24, 2026. At a scale of about 1 km, the overview change matches the calibrated data: correlation of 0.86, typical error of 0.7 dB (almost all of it a constant offset, not noise) and the same sign wherever both detect change. At 170 m, the actual pixel size of the preview, it captures only half of the variability of the calibrated data (correlation of 0.49). It is good for locating areas, not for measuring single pixels. It is one window, not a general figure: a check, not a guarantee.',
  'method.s9.title':
    'The preview stretch is confirmed',
  'method.s9.text':
    'The quality-control metadata of each product confirms how the preview is made: clipping between the 5th and 95th percentiles, gamma of 0.5 and linear units. That metadata cannot be used to calibrate the image (its histogram is of the unaveraged data), so real calibration only comes from the lens.',
  'method.s10.title':
    'The optical map of the day',
  'method.s10.text':
    'It is the daily true-color image from the VIIRS satellite (NASA GIBS) on the “after” date. It shows what an optical satellite sees: often, clouds. NISAR’s radar sees the same area through them, which is why it is worth looking at both together.',
};
