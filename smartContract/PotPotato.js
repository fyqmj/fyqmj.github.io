"use strict";
//道具类型
var Prop = function(text) {
    if (text) {
        var o = JSON.parse(text);
        this.owner = o.owner;//道具所有人
        this.price = new BigNumber(o.price);//道具价格
      } else {
        this.owner = "";
        this.price = new BigNumber(0);
      }
};

Prop.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

//游戏信息
var GameInfo=function(text){
    if (text) {
        var o = JSON.parse(text);

        this.ceoAddress=o.ceoAddress;
        this.hotPropHolder=o.hotPropHolder;
        this.lastHotPropHolder=o.lastHotPropHolder;
        this.lastBidTime=o.lastBidTime;
        this.gameStartTime=o.gameStartTime;
        this.lastPot=new BigNumber(o.lastPot);
        this.sedimentaryBalance=new BigNumber(o.sedimentaryBalance);
      } else {
        this.ceoAddress="";
        this.hotPropHolder="";
        this.lastHotPropHolder="";
        this.lastBidTime="";
        this.gameStartTime="";
        this.lastPot=new BigNumber(0);
        this.sedimentaryBalance=new BigNumber(0);
      }
}

GameInfo.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};


//
var SafeMath = function() {
};

SafeMath.prototype = {
	mul: function (a,b) {
        if (a == 0) {
            return 0;
          }
          var c = a * b;
          //assert(c / a == b);
          return c;
    },
    div: function (a,b) {
        if (a == 0) {
            return 0;
          }
          
          var c = a / b;
          return c;
    },
    sub: function (a,b) {
        if (a <b) {
            return 0;
          }
          var c = a - b;
          return c;
	},
    add: function (a,b) {
        var c = a + b;
        //assert(c >= a);
        return c;
	}
};




var CoinPot = function () {
    LocalContractStorage.defineProperty(this, "ceoAddress"); //管理员账户地址
    LocalContractStorage.defineProperty(this, "hotPropHolder"); //
    LocalContractStorage.defineProperty(this, "lastHotPropHolder"); //最后拥有人
    LocalContractStorage.defineProperty(this, "lastBidTime"); //最后拥有时间
    LocalContractStorage.defineProperty(this, "gameStartTime"); //游戏开始时间
    LocalContractStorage.defineProperty(this, "lastPot"); //
    LocalContractStorage.defineProperty(this, "sedimentaryBalance"); //游戏沉积价值

    LocalContractStorage.defineProperty(this, "gamePropTime");//当前游戏道具煮熟时间;

    //道具列表
    LocalContractStorage.defineMapProperty(this, "propes",{
        parse: function (text) {
            return new Prop(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineProperty(this, "size");


    LocalContractStorage.defineProperty(this, "BASE_gamePropTime");//基本游戏时间
    LocalContractStorage.defineProperty(this, "TIME_MULTIPLIER");////道具间隔时间
    
    LocalContractStorage.defineProperty(this, "NUM_PROPS"); //道具数量 6;
    LocalContractStorage.defineProperty(this, "START_PRICE");//0.001 NAS;开始价格
    LocalContractStorage.defineProperty(this, "CONTEST_INTERVAL"); ////4 minutes;//1 week




};

CoinPot.prototype = {
    init: function () {
        //常量定义
        this.BASE_gamePropTime=1800;//基本煮道具时间，30分钟
        this.TIME_MULTIPLIER=300;//每种道具相差的时间，为5分钟，即300秒

        this.NUM_PROPS=6;//道具数量
        this.START_PRICE=1000000000000000;//初始价格，相当于0.001NAS
        this.CONTEST_INTERVAL=300;//游戏时间间隔，为5分钟，即300秒

        //变量设置
        //初始数据长度为0
        this.size = 0;
        this.gamePropTime=1800;//煮道具时间 30分钟
        this.sedimentaryBalance=new BigNumber(0);//初始锅内余额为0


        this.ceoAddress=Blockchain.transaction.from;
        this.hotPropHolder=0;
        this.gameStartTime=Blockchain.transaction.timestamp;//赋值游戏开始时间为当前时间
        for(var i = 0; i<this.NUM_PROPS; i++){
            var newpotato=new Prop();
            newpotato.owner="";
            newpotato.price=this.START_PRICE;
            this.propes.put(this.size, newpotato);
            this.size+=1;
        }
    },
    getSafeMath:function(){
        var safeMath=new SafeMath();
        return safeMath;
    },
    //购买道具
    buyProp: function (index) {
        //判断现有时间，是否达到游戏开始时间
        if (Blockchain.transaction.timestamp<this.gameStartTime) {
            throw new Error("游戏还没有开始，请稍候！");
          }
        var from = Blockchain.transaction.from;
        var value = Blockchain.transaction.value;
        

        var safeMath=this.getSafeMath();
        if(this._endContestIfNeeded()){ 
            return "购买失败，游戏已结束，你可重新开局游戏。";
            //throw new Error("购买失败，游戏已结束，你可重新开局游戏。");
        }else{
            var tempProp=this.propes.get(index);
            //判断价格
            if (value.lt(tempProp.price)) {
                throw new Error("价格低于现有价格，购买失败！");
              }
            //判断所有者
            if (from == tempProp.owner) {
                throw new Error("你已购买，不可重新购买，购买失败！");
              }
            //判断是否管理员
            if (from == this.ceoAddress) {
                throw new Error("你是管理员，无法购买，购买失败！");
              }

            //道具价格
            var sellingPrice=tempProp.price;
            //付款与价格之间的差值
            var purchaseExcess = safeMath.sub(value, sellingPrice);
            //道具价格的 74%，用于支付给道具所有人
            var payment =new BigNumber(safeMath.div(safeMath.mul(sellingPrice, 74), 100));
            //道具价格的 2% 用于支付给开发人员
            var devFee=new BigNumber(safeMath.div(safeMath.mul(sellingPrice, 2), 100));

            //道具价格的 24% 用于沉积在奖池
            var devFee1=new BigNumber(safeMath.div(safeMath.mul(sellingPrice, 24), 100));
            
            
            this.sedimentaryBalance =devFee1.plus(new BigNumber(this.sedimentaryBalance));
            //throw new Error(" sellingPrice:"+sellingPrice +" purchaseExcess:"+purchaseExcess +" payment:"+payment +"devFee:"+this.sedimentaryBalance +"  tempProp.owner:");
            //20 percent remaining in the contract goes to the pot
            //if the owner is the contract, this is the first purchase, and payment should go to the pot
            if(tempProp.owner!=from){
                //判断是不是第一个道具所有者
                if(tempProp.owner==""){
                    //存入奖池
                    this.sedimentaryBalance =payment.plus(new BigNumber(this.sedimentaryBalance));
                }else{
                    //向道具所有者转帐
                    var result = Blockchain.transfer(tempProp.owner, payment);
                    if (!result) {
                        throw new Error("提取失败，请稍后重试.");
                    }
                }

            }
            //向管理员转账
            Blockchain.transfer(this.ceoAddress, devFee);
            //新道具的价格为 原价格*150 /76,如果有人购买，则你挣了 50%
            var tempPrice=new BigNumber(safeMath.mul(sellingPrice, 150));

            tempProp.price= tempPrice.divToInt(76);
            tempProp.owner=from;//修改道具所有人
            this.propes.put(index, tempProp);
            this.hotPropHolder=from;//修改道具锅最后拥有者
            this.lastBidTime=Blockchain.transaction.timestamp;//修改最后操作时间
            this.gamePropTime=safeMath.add(this.BASE_gamePropTime,safeMath.mul(index,this.TIME_MULTIPLIER)); //根据6种不同的道具，修改做饭时间从30 - 60分钟
            //返回多余的NAS给用户,避免人为恶意提高价格
            Blockchain.transfer(from, purchaseExcess);
            return "购买成功！";
        }
    },
    getProp: function (index) {
        return this.propes.get(index);;
    },
    getGameInfo:function(){
        var gameInfo=new GameInfo();
        gameInfo.ceoAddress=this.ceoAddress;
        gameInfo.hotPropHolder=this.hotPropHolder;
        gameInfo.lastBidTime=this.lastBidTime;
        gameInfo.sedimentaryBalance=this.sedimentaryBalance;
        gameInfo.lastPot=this.lastPot;
        gameInfo.gameStartTime=this.gameStartTime;
        return gameInfo;
    },
    getBalance: function () {
        return this.sedimentaryBalance;
    },
    //计算当前时间点与最后游戏时间点之间的差值
    timePassed:function(){
        
        if(this.lastBidTime==0){
            return 0;
        }
        
        return this.getSafeMath().sub(Blockchain.transaction.timestamp,this.lastBidTime);
    },
    //下次游戏开始时间
    timeLeftToContestStart:function(){
        if(Blockchain.transaction.timestamp>this.gameStartTime){
            return 0;
        }
        return this.getSafeMath().sub(this.gameStartTime,Blockchain.transaction.timestamp);
    },
    //获取游戏剩余时间
    timeLeftToCook:function(){
        return this.getSafeMath().sub(this.gamePropTime,this.timePassed());
    },
    //判断玉米是否已经煮熟
    contestOver:function(){
        return this.timePassed()>=this.gamePropTime;
    },
    _endContestIfNeeded:function(){
        //判断最后一次游戏时间与现有时间的差值，判断玉米是否煮熟
        if(this.timePassed()>=this.gamePropTime){
            //玉米已煮熟，游戏结束。
            var from = Blockchain.transaction.from;
            var value = Blockchain.transaction.value;
            //最后一个调用、
            //将支付返回给调用者。
            Blockchain.transfer(from, value);

            if(this.hotPropHolder==""){
                this.hotPropHolder=this.ceoAddress;//当上一个游戏所有者为空时，将控制者改为管理员
            }
            this.lastPot=this.sedimentaryBalance;
            this.lastHotPropHolder=this.hotPropHolder;
            //向最后个一个所有者转账,将所有锅内奖金全部给他。
            Blockchain.transfer(this.hotPropHolder, this.sedimentaryBalance);

            this.hotPropHolder="";
            this.lastBidTime=0;
            //重置游戏道具
            for(var i = 0; i<this.NUM_PROPS; i++){
                var newpotato=new Prop();
                newpotato.owner="";
                newpotato.price=this.START_PRICE;
                this.propes.put(i,newpotato);
            }
            //重置游戏时间
            var start=this.gameStartTime;
            while(start<Blockchain.transaction.timestamp){
                start=this.getSafeMath().add(start,this.CONTEST_INTERVAL);
            }
            this.gameStartTime=start;
            return true;
        }
        return false;
    }
};
module.exports = CoinPot;