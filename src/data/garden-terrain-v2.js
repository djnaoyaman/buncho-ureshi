// Source-image-normalized feet and directed routes reviewed against HTML v2.
// Presentation only: no cast, save fields, RNG, color filters or demo controls.
export const GARDEN_TERRAIN_V2 = Object.freeze({
 'yuyake':{order:['preen','step','tap','flight','dispute','preen'],main:'log',zones:'奥は倒木右の薄い苔面・中ほどは倒木の太い面・手前は下の土道',maxRise:.026,
   edges:[{a:[.305,.700],b:[.402,.688],via:[.352,.696],surface:'log',motion:'step',weight:5},{a:[.305,.700],b:[.447,.684],via:[.365,.694],surface:'log',motion:'step',weight:3},{a:[.25,.699],b:[.413,.686],from:'log',to:'log',motion:'flight',weight:1}], occlusion:'原画の倒木上のみ、幹の垂直面は立入不可'},
 'bird-eurasian-bullfinch':{order:['step','depth','tap','preen','tap','preen'],main:'slab',zones:'奥は石の山側・中ほどは石の天面・手前は下の土の余白',maxRise:.064,
   edges:[{a:[.308,.619],b:[.467,.582],via:[.380,.603],surface:'slab',motion:'step',weight:5},{a:[.308,.619],b:[.419,.608],via:[.361,.613],surface:'slab',motion:'step',weight:1},{a:[.234,.568],b:[.59,.568],surface:'slab',motion:'depth',weight:4}],occlusion:'岩の垂直面と細枝は足場にしない'},
 'bird-white-winged-crossbill':{order:['depth','flight','step','tap','preen','depth'],main:'woods',zones:'奥は岩棚の高い側・中ほどは岩棚の内側・手前は小道',maxRise:.06,
   edges:[{a:[.302,.700],b:[.422,.671],via:[.357,.690],surface:'woods',motion:'step',weight:5},{a:[.302,.700],b:[.402,.688],via:[.352,.696],surface:'woods',motion:'step',weight:3},{a:[.264,.655],b:[.602,.653],surface:'woods',motion:'depth',weight:4},{a:[.372,.863],b:[.507,.683],from:'trail',to:'woods',motion:'flight',weight:4}],occlusion:'既存の左枝マスクを奥の個体に重ねる'},
 'bali-terrace':{order:['flight','depth','dispute','step','tap','preen'],main:'terrace',zones:'奥は石段の山側・中ほどは石段の天面・手前は草の踊り場',maxRise:.059,
   edges:[{a:[.306,.714],b:[.420,.686],via:[.363,.700],surface:'terrace',motion:'step',weight:5},{a:[.306,.714],b:[.386,.729],via:[.347,.721],surface:'terrace',motion:'step',weight:3},{a:[.216,.666],b:[.611,.667],surface:'terrace',motion:'depth',weight:4},{a:[.467,.878],b:[.463,.718],from:'lawn',to:'terrace',motion:'flight',weight:5}],occlusion:'既存の葉マスクと石段段差。草→石は飛ぶ'}
});
export const EXTRA_GROUND = Object.freeze({
 yuyake:{floor:[[.235,.889],[.405,.879],[.62,.893],[.77,.913],[.755,.963],[.28,.958]]},
 'bird-eurasian-bullfinch':{floor:[[.36,.91],[.48,.892],[.64,.896],[.79,.906],[.8,.961],[.41,.96]]}
});
